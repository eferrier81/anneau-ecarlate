"""Génère les icônes de l'appli (motif original : anneau lumineux, hexagone, runes).
Usage : python scripts/generate-icons.py   (nécessite cairosvg)"""
import math
import os

import cairosvg

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'images')
BG = '#0D0A0B'

GLYPHS = [
    'M0,-5 L0,5 M-3,-2 L3,-2',
    'M-3,5 L0,-5 L3,5',
    'M0,-5 L0,5 M0,0 L3,-3 M0,2 L-3,-1',
    'M0,-5 L3,0 L0,5 L-3,0 Z',
    'M-3,-5 L3,-5 M0,-5 L0,5 M-2,5 L2,5',
    'M-3,-5 L3,5 M3,-5 L0,0',
]


def hexagon(r, rot=30):
    pts = []
    for i in range(6):
        a = math.radians(60 * i + rot)
        pts.append(f'{512 + r * math.cos(a):.1f},{512 + r * math.sin(a):.1f}')
    return ' '.join(pts)


def motif(mono=None, runes=True):
    ring = mono or 'url(#ring)'
    line = mono or '#E0142B'
    parts = []
    if not mono:
        parts.append('<circle cx="512" cy="512" r="430" fill="url(#halo)"/>')
        parts.append('<circle cx="512" cy="512" r="250" fill="none" stroke="#E0142B" stroke-width="90" opacity="0.55" filter="url(#blur)"/>')
    parts.append(f'<polygon points="{hexagon(345)}" fill="none" stroke="{line}" stroke-width="7" opacity="{1 if mono else 0.6}"/>')
    parts.append(f'<circle cx="512" cy="512" r="250" fill="none" stroke="{ring}" stroke-width="72"/>')
    if runes:
        for i in range(12):
            g = GLYPHS[i % len(GLYPHS)]
            parts.append(
                f'<g transform="translate(512 512) rotate({i * 30}) translate(0 -400) scale(4.2)">'
                f'<path d="{g}" fill="none" stroke="{line}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" opacity="{1 if mono else 0.85}"/></g>'
            )
    return '\n'.join(parts)


DEFS = '''<defs>
  <radialGradient id="halo" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#E0142B" stop-opacity="0.45"/>
    <stop offset="0.6" stop-color="#8B0A1A" stop-opacity="0.25"/>
    <stop offset="1" stop-color="#0D0A0B" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FF6B7A"/>
    <stop offset="0.45" stop-color="#E0142B"/>
    <stop offset="1" stop-color="#7A0816"/>
  </linearGradient>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
</defs>'''


def svg(body, bg=None, scale=1.0):
    rect = f'<rect width="1024" height="1024" fill="{bg}"/>' if bg else ''
    tr = f'translate(512 512) scale({scale}) translate(-512 -512)'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">'
            f'{DEFS}{rect}<g transform="{tr}">{body}</g></svg>')


def render(name, content, size=1024):
    cairosvg.svg2png(bytestring=content.encode(), write_to=os.path.join(ROOT, name),
                     output_width=size, output_height=size)
    print('écrit', name)


render('icon.png', svg(motif(), bg=BG, scale=0.92))
render('android-icon-foreground.png', svg(motif(), scale=0.62))
render('android-icon-background.png', svg('', bg=BG))
render('android-icon-monochrome.png', svg(motif(mono='#FFFFFF'), scale=0.62))
render('splash-icon.png', svg(motif(), scale=1.0), size=512)
render('notification-icon.png', svg(motif(mono='#FFFFFF', runes=False), scale=1.15), size=96)
render('favicon.png', svg(motif(runes=False), bg=BG), size=48)
