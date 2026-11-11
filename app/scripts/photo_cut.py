"""Tách nền ảnh chụp thật thành thẻ PNG trong suốt (dùng bởi photo-cards.mjs).

Chạy (từ app/):
  uv run --python C:/Users/tdqua/AppData/Local/Programs/Python/Python312/python.exe \
    --with onnxruntime --with pillow --with numpy --with scipy python scripts/photo_cut.py jobs.json

jobs.json: {"model": "<đường dẫn .onnx BiRefNet>", "size": 512, "fill": 0.85,
            "jobs": [{"id", "src", "out", "crop"?: [x0,y0,x1,y1] (tỉ lệ 0..1),
                      "keep"?: "largest" | "all", "minPart"?: 0.04, "thresh"?: 0.5}]}

Không dùng gói rembg vì numba (phụ thuộc của nó) bị AppControl chặn trên máy này;
gọi thẳng model BiRefNet-lite của rembg qua onnxruntime.
"""
import io
import json
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image
from scipy import ndimage

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
NET = 1024


def predict_mask(sess, img):
    x = img.convert('RGB').resize((NET, NET), Image.BICUBIC)
    a = (np.asarray(x, dtype=np.float32) / 255.0 - MEAN) / STD
    a = a.transpose(2, 0, 1)[None]
    out = sess.run(None, {sess.get_inputs()[0].name: a})[0][0, 0]
    m = 1.0 / (1.0 + np.exp(-out))
    mi = Image.fromarray((m * 255).astype(np.uint8)).resize(img.size, Image.BICUBIC)
    return np.asarray(mi, dtype=np.float32) / 255.0


def clean_alpha(m, keep, min_part, thresh):
    # Ngưỡng mềm: bỏ phần mờ do nền, giữ mép mịn khoảng 2-3px.
    a = np.clip((m - 0.25) / 0.5, 0, 1)
    solid = m > thresh
    lab, n = ndimage.label(solid)
    if n == 0:
        return a
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    big = sizes.max()
    if keep == 'largest':
        ok = [i + 1 for i, s in enumerate(sizes) if s == big]
    else:
        ok = [i + 1 for i, s in enumerate(sizes) if s >= big * min_part]
    body = np.isin(lab, ok)
    body = ndimage.binary_fill_holes(body) if keep == 'largest' else body
    # Vùng được phép có alpha: thân + viền nở 3px (cho mép mềm); ngoài đó xóa hết đốm.
    allow = ndimage.binary_dilation(body, iterations=3)
    a = np.where(allow, a, 0)
    a = np.where(body & (m > 0.9), 1.0, a)
    a[a < 0.06] = 0
    return a


def decontaminate(rgb, a):
    # Pixel mép (alpha < 1) mang màu nền: thay màu bằng màu thân gần nhất.
    inner = (a > 0.98).astype(np.float32)
    if inner.sum() == 0:
        return rgb
    acc = rgb * inner[..., None]
    w = inner.copy()
    fill = rgb.copy()
    known = inner > 0
    for sigma in (1.5, 3, 6, 12):
        num = np.stack([ndimage.gaussian_filter(acc[..., c], sigma) for c in range(3)], -1)
        den = ndimage.gaussian_filter(w, sigma)
        est = num / np.maximum(den, 1e-6)[..., None]
        newly = (~known) & (den > 1e-3)
        fill[newly] = est[newly]
        known |= newly
    t = np.clip(a, 0, 1)[..., None]
    # Giữ một phần màu gốc ở mép hơi trong suốt (lông, tóc) để không bị bệt.
    mix = np.clip((t - 0.5) / 0.5, 0, 1)
    return fill * (1 - mix) + rgb * mix


def fit(img_rgba, size, fill):
    a = np.asarray(img_rgba)[..., 3]
    ys, xs = np.nonzero(a > 8)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    sub = img_rgba.crop(box)
    w, h = sub.size
    target = size * fill
    s = target / max(w, h)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    sub = sub.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(sub, ((size - nw) // 2, (size - nh) // 2))
    return canvas


def main():
    cfg = json.load(open(sys.argv[1], encoding='utf-8'))
    sess = None
    size, fill = cfg.get('size', 512), cfg.get('fill', 0.85)
    for job in cfg['jobs']:
        img = Image.open(job['src'])
        img.load()
        img = img.convert('RGB')
        if job.get('crop'):
            x0, y0, x1, y1 = job['crop']
            W, H = img.size
            img = img.crop((round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H)))
        # Làm việc ở ~1600px là đủ cho thẻ 512px.
        sc = 1600 / max(img.size)
        if sc < 1:
            img = img.resize((round(img.width * sc), round(img.height * sc)), Image.LANCZOS)
        # Cache mask (chạy model ~1 phút/ảnh trên CPU) theo ảnh gốc + crop.
        key = json.dumps([job['src'], job.get('crop'), img.size])
        cache = job['src'] + '.mask.png'
        meta = job['src'] + '.mask.key'
        try:
            hit = open(meta, encoding='utf-8').read() == key
        except OSError:
            hit = False
        if hit:
            m = np.asarray(Image.open(cache), dtype=np.float32) / 255.0
        else:
            if sess is None:
                sess = ort.InferenceSession(cfg['model'], providers=['CPUExecutionProvider'])
            m = predict_mask(sess, img)
            Image.fromarray((m * 255).astype(np.uint8)).save(cache)
            open(meta, 'w', encoding='utf-8').write(key)
        a = clean_alpha(m, job.get('keep', 'largest'), job.get('minPart', 0.04), job.get('thresh', 0.5))
        rgb = np.asarray(img, dtype=np.float32)
        rgb = decontaminate(rgb, a)
        out = np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)
        card = fit(Image.fromarray(out, 'RGBA'), size, fill)
        # Mép trong suốt hoàn toàn: đặt RGB = 0 để PNG nén tốt hơn.
        arr = np.asarray(card).copy()
        # Xóa đốm rời nhỏ (< 40px) để bóng trong trò Bóng hình sạch.
        lab, n = ndimage.label(arr[..., 3] > 0, structure=np.ones((3, 3)))
        if n > 1:
            sizes = ndimage.sum(np.ones(lab.shape), lab, range(1, n + 1))
            tiny = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s < 40])
            arr[tiny, 3] = 0
        arr[arr[..., 3] == 0, :3] = 0
        final = Image.fromarray(arr, 'RGBA')
        buf = io.BytesIO()
        final.save(buf, 'PNG', optimize=True)
        if buf.tell() > 120 * 1024:
            # Ảnh chụp nhiều chi tiết (lông) → PNG 32-bit quá nặng; bảng 256 màu + dither
            # nhìn gần như không khác mà nhỏ còn ~1/3.
            final = final.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
        final.save(job['out'], optimize=True)
        print(job['id'], 'ok', flush=True)


if __name__ == '__main__':
    main()
