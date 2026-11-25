"""Import blog posts from a Medium RSS export.

Usage:
    python manage.py import_medium /path/to/medium.xml /path/to/images /path/to/static/blog [--replace]

Expects image_dir to contain cover-1..N.jpg (RSS item order) and
kamna-avatar.jpg. Copies them into static_dir.
"""
import re
import shutil
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from api.models import BlogPost

CONTENT_NS = '{http://purl.org/rss/1.0/modules/content/}encoded'

ALLOWED_TAGS = {
    'p': set(),
    'h3': set(),
    'h4': set(),
    'blockquote': set(),
    'strong': set(),
    'b': set(),
    'em': set(),
    'i': set(),
    'u': set(),
    'ul': set(),
    'ol': set(),
    'li': set(),
    'br': set(),
    'hr': set(),
    'a': {'href'},
}
DROP_ENTIRELY = {'img', 'figure', 'figcaption', 'script', 'style', 'iframe'}


class Sanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.drop_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in DROP_ENTIRELY:
            self.drop_depth += 1
            return
        if tag not in ALLOWED_TAGS:
            return
        kept = []
        if tag == 'a':
            for k, v in attrs:
                if k == 'href' and v.startswith(('http://', 'https://')):
                    v = v.replace('"', '')
                    kept.append(f'href="{v}"')
        self.out.append(f'<{tag}' + (f' {" ".join(kept)}' if kept else '') + '>')

    def handle_endtag(self, tag):
        if tag in DROP_ENTIRELY:
            self.drop_depth = max(0, self.drop_depth - 1)
            return
        if tag in ALLOWED_TAGS:
            self.out.append(f'</{tag}>')

    def handle_startendtag(self, tag, attrs):
        if tag in DROP_ENTIRELY or self.drop_depth:
            return
        if tag in ALLOWED_TAGS:
            self.out.append(f'<{tag}>')

    def handle_data(self, data):
        if self.drop_depth:
            return
        self.out.append(data)

    def result(self) -> str:
        return ''.join(self.out).strip()


def clean_body(html: str) -> str:
    s = Sanitizer()
    s.feed(html)
    body = re.sub(r'\n{3,}', '\n\n', s.result())
    # collapse empty paragraphs left by dropped figures
    body = re.sub(r'<p>\s*</p>', '', body)
    return body.strip()


def plain_text(html: str) -> str:
    txt = re.sub(r'<[^>]+>', ' ', html)
    return re.sub(r'\s+', ' ', txt).strip()


class Command(BaseCommand):
    help = 'Import blog posts from a Medium RSS file'

    def add_arguments(self, parser):
        parser.add_argument('rss_path', type=str)
        parser.add_argument('image_dir', type=str)
        parser.add_argument('static_dir', type=str)
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Delete all existing blog posts before importing',
        )

    def handle(self, *args, **options):
        rss_path = Path(options['rss_path'])
        image_dir = Path(options['image_dir'])
        static_dir = Path(options['static_dir'])
        if not rss_path.is_file():
            raise CommandError(f'RSS not found: {rss_path}')
        if not image_dir.is_dir():
            raise CommandError(f'Image dir not found: {image_dir}')
        static_dir.mkdir(parents=True, exist_ok=True)

        if options['replace']:
            deleted, _ = BlogPost.objects.all().delete()
            self.stdout.write(f'Deleted {deleted} existing post(s)')

        tree = ET.parse(rss_path)
        items = tree.getroot().find('channel').findall('item')

        avatar_src = image_dir / 'kamna-avatar.jpg'
        if avatar_src.is_file():
            shutil.copy2(avatar_src, static_dir / 'author-kamna.jpg')
            self.stdout.write('Copied author-kamna.jpg')

        imported = skipped = 0
        for n, item in enumerate(items, start=1):
            title = (item.findtext('title') or '').strip()
            if not title:
                skipped += 1
                continue
            base_slug = slugify(title)[:300] or f'post-{n}'
            slug = base_slug
            suffix = 2
            while BlogPost.objects.filter(slug=slug).exists():
                slug = f'{base_slug}-{suffix}'
                suffix += 1
                if suffix > 50:
                    break
            if BlogPost.objects.filter(slug=slug).exists():
                skipped += 1
                continue

            raw_link = (item.findtext('link') or '').strip()
            parts = urlsplit(raw_link)
            medium_url = urlunsplit(
                (parts.scheme, parts.netloc, parts.path, '', '')
            )

            el = item.find(CONTENT_NS)
            raw_html = el.text if el is not None else ''
            body_html = clean_body(raw_html)
            text = plain_text(body_html)
            excerpt = (
                text[:200].rsplit(' ', 1)[0] + '…'
                if len(text) > 200
                else text
            )

            cover_src = image_dir / f'cover-{n}.jpg'
            cover_image = ''
            if cover_src.is_file():
                dest = static_dir / f'cover-{n}.jpg'
                shutil.copy2(cover_src, dest)
                cover_image = f'/blog/cover-{n}.jpg'

            pub = (item.findtext('pubDate') or '').strip()
            published_at = parsedate_to_datetime(pub) if pub else None

            BlogPost.objects.create(
                title=title,
                slug=slug,
                excerpt=excerpt,
                body_html=body_html,
                cover_image=cover_image,
                medium_url=medium_url,
                published_at=published_at,
            )
            imported += 1
            self.stdout.write(f'  [{n}] {title[:60]}')

        self.stdout.write(
            self.style.SUCCESS(f'Imported {imported} post(s), skipped {skipped}')
        )
