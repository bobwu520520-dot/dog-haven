"""
立绘头部裁切框 —— 可视化标定
==================================================================
上一版用「行宽局部极小 = 脖颈」自动找头，结果被翘起的尾巴骗了
（柴犬 / 哈士奇的「头」其实定位到了尾巴尖）。
只有 8 张固定立绘，最可靠的做法是打上归一化网格，肉眼读坐标。

输出：scratch/shots/_head_grid.png
      每格 = 一只狗，覆盖 10% 间隔的网格，网格坐标以 alpha 包围盒为 0~100%。
"""
from PIL import Image, ImageDraw

ART = [
    ('golden', 'golden.jpg'),
    ('shiba', 'shiba_inu.jpg'),
    ('corgi', 'corgi.jpg'),
    ('border_collie', 'border_collie.jpg'),
    ('samoyed', 'samoyed.jpg'),
    ('husky', 'husky.jpg'),
    ('frenchie', 'french_bulldog.jpg'),
    ('labrador', 'labrador.jpg'),
]

CELL = 300


def alpha_bbox(path, thresh=232):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    px = im.load()
    minx, maxx, miny, maxy = W, -1, H, -1
    for y in range(H):
        for x in range(W):
            r, g, b = px[x, y]
            if not (r >= thresh and g >= thresh and b >= thresh):
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    return im, (minx, miny, maxx, maxy)


def main():
    cols = 4
    rows = (len(ART) + cols - 1) // cols
    sheet = Image.new('RGB', (CELL * cols, CELL * rows), (255, 255, 255))
    d = ImageDraw.Draw(sheet)

    for i, (breed, fn) in enumerate(ART):
        im, (bx0, by0, bx1, by1) = alpha_bbox(f'assets/art/{fn}')
        bw, bh = bx1 - bx0 + 1, by1 - by0 + 1
        crop = im.crop((bx0, by0, bx1 + 1, by1 + 1)).resize((CELL, CELL))
        cx0, cy0 = (i % cols) * CELL, (i // cols) * CELL
        sheet.paste(crop, (cx0, cy0))

        # 10% 网格
        for k in range(1, 10):
            p = int(CELL * k / 10)
            col = (255, 0, 0) if k == 5 else (0, 160, 255)
            d.line([(cx0 + p, cy0), (cx0 + p, cy0 + CELL)], fill=col, width=1)
            d.line([(cx0, cy0 + p), (cx0 + CELL, cy0 + p)], fill=col, width=1)

        # 每 20% 标注刻度
        for k in range(0, 11, 2):
            p = int(CELL * k / 10)
            d.text((cx0 + p + 2, cy0 + 2), str(k * 10), fill=(200, 0, 0))
            d.text((cx0 + 2, cy0 + p + 2), str(k * 10), fill=(0, 0, 200))

        d.rectangle([cx0, cy0, cx0 + CELL - 1, cy0 + CELL - 1], outline=(120, 120, 120))
        d.rectangle([cx0, cy0 + CELL - 16, cx0 + CELL, cy0 + CELL], fill=(255, 255, 255))
        d.text((cx0 + 4, cy0 + CELL - 14), f'{breed}  bbox {bw}x{bh}', fill=(0, 0, 0))

    sheet.save('scratch/shots/_head_grid.png')
    print('网格标定图: scratch/shots/_head_grid.png')
    print('坐标说明：每个格子内部 0~100% 对应 alpha 包围盒的归一化坐标')


if __name__ == '__main__':
    main()
