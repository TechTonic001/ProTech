import struct, zlib, os
os.makedirs('public/icons', exist_ok=True)


def build_png(size, color):
    width, height = size, size
    data = bytearray()
    for y in range(height):
        data.append(0)
        for x in range(width):
            data.extend(color)
    compressor = zlib.compressobj()
    compressed = compressor.compress(bytes(data)) + compressor.flush()

    def chunk(type_bytes, data_bytes):
        return struct.pack('>I', len(data_bytes)) + type_bytes + data_bytes + struct.pack('>I', zlib.crc32(type_bytes + data_bytes) & 0xffffffff)

    png = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png


def write_file(path, data):
    with open(path, 'wb') as f:
        f.write(data)


def write_png(path, size, color):
    write_file(path, build_png(size, color))


def write_ico(path, png_bytes, size):
    width = 0 if size == 256 else size
    height = width
    header = struct.pack('<3H', 0, 1, 1)
    entry = struct.pack('<BBBBHHII', width, height, 0, 0, 1, 32, len(png_bytes), 6 + 16)
    write_file(path, header + entry + png_bytes)

write_png('public/icons/icon-192.png', 192, (21, 101, 192))
write_png('public/icons/icon-512.png', 512, (21, 101, 192))
png_bytes = build_png(32, (21, 101, 192))
write_file('public/favicon.png', png_bytes)
write_ico('public/favicon.ico', png_bytes, 32)
print('Generated PNG and ICO assets')
