import csv
from datetime import datetime, timezone as dt_timezone
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from api.models import Email

EXPECTED_COLUMNS = {'id', 'email', 'ip', 'user_agent', 'created_at'}


class Command(BaseCommand):
    help = 'Import emails from a CSV export (id,email,ip,user_agent,created_at)'

    def add_arguments(self, parser):
        parser.add_argument('csv_path', type=str)
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Delete all existing email rows before importing',
        )

    def handle(self, *args, **options):
        csv_path = Path(options['csv_path'])
        if not csv_path.is_file():
            raise CommandError(f'File not found: {csv_path}')

        if options['replace']:
            deleted, _ = Email.objects.all().delete()
            self.stdout.write(f'Deleted {deleted} existing row(s)')

        imported = skipped = 0
        with open(csv_path, newline='', encoding='utf-8') as fh:
            reader = csv.DictReader(fh)
            missing = EXPECTED_COLUMNS - set(reader.fieldnames or [])
            if missing:
                raise CommandError(f'CSV missing columns: {sorted(missing)}')

            for line_no, row in enumerate(reader, start=2):
                email = (row.get('email') or '').strip().lower()
                if not email:
                    skipped += 1
                    continue
                if Email.objects.filter(email=email).exists():
                    skipped += 1
                    continue

                created_at = None
                raw_created = (row.get('created_at') or '').strip()
                if raw_created:
                    try:
                        created_at = datetime.strptime(
                            raw_created, '%Y-%m-%d %H:%M:%S'
                        ).replace(tzinfo=dt_timezone.utc)
                    except ValueError:
                        self.stdout.write(
                            f'line {line_no}: bad created_at {raw_created!r}, using now'
                        )

                obj = Email.objects.create(
                    email=email,
                    ip=(row.get('ip') or '').strip() or None,
                    user_agent=(row.get('user_agent') or '').strip() or None,
                )
                # auto_now_add overrode the CSV date on create — set it explicitly
                Email.objects.filter(pk=obj.pk).update(created_at=created_at)
                imported += 1

        self.stdout.write(
            self.style.SUCCESS(f'Imported {imported} row(s), skipped {skipped}')
        )
