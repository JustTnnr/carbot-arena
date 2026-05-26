import struct

def what(file, h=None):
    if h is None:
        if isinstance(file, str):
            with open(file, 'rb') as f:
                h = f.read(32)
        else:
            location = file.tell()
            h = file.read(32)
            file.seek(location)
    for tf in tests:
        res = tf(h, file)
        if res:
            return res

tests = []

def test_jpeg(h, f):
    if h[:3] == b'\xff\xd8\xff':
        return 'jpeg'

def test_png(h, f):
    if h[:8] == b'\x89PNG\r\n\x1a\n':
        return 'png'

def test_gif(h, f):
    if h[:6] in (b'GIF87a', b'GIF89a'):
        return 'gif'

def test_webp(h, f):
    if h[:4] == b'RIFF' and h[8:12] == b'WEBP':
        return 'webp'

def test_bmp(h, f):
    if h[:2] == b'BM':
        return 'bmp'

def test_tiff(h, f):
    if h[:2] in (b'MM', b'II'):
        return 'tiff'

tests = [test_jpeg, test_png, test_gif, test_webp, test_bmp, test_tiff]
