"""Seed Topmate testimonials (31) + Topmate counts.

Run: ./.venv/bin/python manage.py seed_testimonials [--replace]
"""

from django.core.management.base import BaseCommand

from api.models import SiteSetting, Testimonial

# (name, date_label, text) — newest first. First 3 are the latest real
# Topmate reviews (https://topmate.io/kamna_bhardwaj); rest are the
# previously published site reviews.
REVIEWS = [
    (
        "Samiksha Mishra",
        "Sep 2026",
        "It was helpful.",
    ),
    (
        "Aditi Agarwal",
        "Jul 2026",
        "Thankyou so much for guiding me with content creation and with your personal story...it really motivated me a lot and I felt extremely inspired from you..",
    ),
    (
        "Anonymous",
        "May 2026",
        "Badhiyaa tha",
    ),
    (
        "Manvi Narang",
        "Dec 2025",
        "I had a really lovely conversation with Kamna. Talking to her felt easy and energising — it was just very visible that she had great knowledge about her craft. What stood out was how naturally she connected the dots, quickly understanding context and offering thoughtful, relevant strategies on the spot. Kamna brings clarity, sharp thinking, and a strategic lens that makes her someone you genuinely want in your corner if you're serious about growing on LinkedIn!",
    ),
    (
        "B Pujita",
        "Dec 2025",
        "A 30-minute talk with Kamna was more than enough to set the foundation for my LinkedIn content journey. What felt like a casual, effortless conversation turned out to be a powerful session without me even realising it. Her guidance was clear, comforting, and incredibly effective. Did I ever feel like a 'client' instead of a person? Not even for a moment. That's the magic of Kamna!",
    ),
    (
        "Shreya",
        "Dec 2025",
        "This session was way more than what it's actually priced at. Kamna is just the most sweetest person and thoughtful creator I have come across and the insights and content ideas I gained from her are massive and totally a game changer. Grab the opportunity while you can!",
    ),
    (
        "Anirudh Agarwal",
        "Jan 2026",
        "Kamna was super helpful, and extremely specific with her tips and advice. She takes her time to understand one's specific needs, their strengths and weaknesses to help out with the potential strategy. Cherry on top — she's super friendly, knows her stuff and goes beyond the scope to help people!",
    ),
    (
        "Gargi Lad",
        "Mar 2026",
        "I just loved the talk-session with Kamna!! It was so real and candid and really, really helpful.",
    ),
    (
        "Kashvi Saraf",
        "Jan 2026",
        "She is extremely talented yet very humble. She gave me some genuine advice. It's very refreshing to talk to her. Worth every penny and more! Definitely recommend people connect with her!",
    ),
    (
        "Pari Arora",
        "Dec 2025",
        "Kamna was super cool and friendly, felt I was talking to my friend. Best call ever, got so many insights in just 30 minutes.",
    ),
    (
        "Sourabh Ss",
        "Jun 2025",
        "One hour with Kamna felt like talking to a creator bestie who just gets it. She simplified everything, asked the right questions, and left me inspired. If you're ever stuck or curious — talk to her. Worth every minute!",
    ),
    (
        "Soniya Agrawal",
        "Dec 2025",
        "It was one of the best sessions I have attended so far. Just loved her energy and everything. She made me so comfortable that I could easily tell her my struggles and problems. So grateful for this session. Highly recommended.",
    ),
    (
        "Hira Singh",
        "Dec 2025",
        "Kamna is so insightful and full of genuine energy. Our session gave me exactly the clarity I needed on LinkedIn content strategy. She doesn't just give generic advice — she really listens and tailors everything to your situation. One of the best investments I've made for my personal brand!",
    ),
    (
        "Tanishka Mehta",
        "Jan 2026",
        "Had an amazing session with Kamna! She's incredibly knowledgeable about LinkedIn and content creation. Her advice was practical, personalised, and easy to implement. What I loved most was how she made the whole conversation feel natural — like talking to a mentor who genuinely cares about your growth. Highly recommend!",
    ),
    (
        "Riya Sharma",
        "Feb 2026",
        "Kamna has this incredible ability to simplify complex ideas. In just 30 minutes, she gave me a clear roadmap for my LinkedIn presence. She's not just knowledgeable — she's also incredibly warm and encouraging. If you're serious about your personal brand, you need to talk to her!",
    ),
    (
        "Aditya Kumar",
        "Jan 2026",
        "The session with Kamna was an eye-opener. I came in with vague ideas about content creation and left with a concrete strategy. Her understanding of LinkedIn algorithms and engagement tactics is impressive. Plus, she's just a really genuine person who wants to see you succeed!",
    ),
    (
        "Priya Nair",
        "Feb 2026",
        "I was skeptical at first, but Kamna completely changed my perspective on LinkedIn content. Her insights are gold. She helped me identify my unique angle and gave me specific content ideas that align with my brand. The session was worth every rupee and more. Thank you, Kamna!",
    ),
    (
        "Arjun Verma",
        "Mar 2026",
        "Kamna is the real deal. Her knowledge about LinkedIn content strategy is unmatched, and she delivers it in such a friendly, approachable way. I walked away with actionable steps I could implement immediately. My LinkedIn engagement has already improved after just one session. Highly recommended!",
    ),
    (
        "Neha Gupta",
        "Dec 2025",
        "What an incredible session! Kamna has this rare ability to understand exactly where you are in your journey and give you the push in the right direction. Her content advice is practical and her energy is infectious. I left the call feeling motivated and ready to take action!",
    ),
    (
        "Vikram Malhotra",
        "Jan 2026",
        "Talking to Kamna was like having a GPS for my LinkedIn strategy. She pinpointed exactly where I was going wrong and gave me a clear path forward. Her expertise in personal branding is evident, and her genuine interest in your success makes the experience even more valuable.",
    ),
    (
        "Ananya Bose",
        "Feb 2026",
        "Kamna is phenomenal! She doesn't just talk — she listens, understands, and then gives you tailored advice that actually makes sense for your specific situation. The session was packed with value and I'm already implementing her suggestions. Can't wait to see the results!",
    ),
    (
        "Rohan Desai",
        "Mar 2026",
        "Had a fantastic session with Kamna. She has a deep understanding of what works on LinkedIn and explains it in a way that's easy to understand and implement. Her passion for helping others grow is evident in every word. This was genuinely one of the best investments I've made in my professional development.",
    ),
    (
        "Meera Iyer",
        "Jan 2026",
        "Kamna's guidance was exactly what I needed to kick-start my LinkedIn journey. She helped me understand my strengths and how to showcase them effectively. The session was conversational, insightful, and incredibly motivating. I left feeling confident and ready to create content that truly represents me.",
    ),
    (
        "Karan Chopra",
        "Feb 2026",
        "Exceptional session with Kamna! She has a talent for breaking down complex concepts into simple, actionable steps. Her knowledge of LinkedIn content strategy is vast, and she generously shares it. I particularly appreciated how she tailored her advice to my specific goals. Worth every penny!",
    ),
    (
        "Divya Reddy",
        "Mar 2026",
        "Kamna is a gem! Her session was transformative for my approach to LinkedIn. She has an incredible understanding of what resonates with audiences and how to tell your story authentically. Her warm, encouraging style made me feel supported throughout. I'm already seeing changes in my engagement!",
    ),
    (
        "Siddharth Jain",
        "Dec 2025",
        "This was hands down the most valuable 30 minutes I've spent on my personal brand. Kamna's insights are practical, specific, and immediately actionable. She understands the nuances of LinkedIn content better than anyone I've spoken to. If you're serious about building your presence, book a session with her now!",
    ),
    (
        "Pooja Singh",
        "Jan 2026",
        "Kamna exceeded all my expectations! Her depth of knowledge about LinkedIn and personal branding is impressive, but what really sets her apart is how she makes you feel heard and understood. She gave me clarity on my content direction and specific strategies to implement. Highly recommend to anyone looking to level up!",
    ),
    (
        "Rahul Trivedi",
        "Feb 2026",
        "Just had a session with Kamna and I'm blown away by the value she provides. She quickly grasped my situation and gave me tailored advice that I could start using immediately. Her passion for helping people build authentic personal brands really shines through. Definitely booking another session!",
    ),
    (
        "Simran Kaur",
        "Mar 2026",
        "Kamna is absolutely brilliant at what she does! In just one session, she helped me see my LinkedIn presence in a completely new light. Her advice was spot-on, practical, and delivered with such genuine care. I walked away feeling empowered and excited about creating content. Thank you, Kamna!",
    ),
    (
        "Ayush Pandey",
        "Jan 2026",
        "Had a really productive session with Kamna. She helped me identify my content pillars and gave me a clear framework for consistent posting. What I appreciated most was how she balanced strategy with authenticity — she never suggested anything that felt fake or forced. Great experience overall!",
    ),
    (
        "Ishaan Kapoor",
        "Feb 2026",
        "Kamna's session was a game-changer for me. I'd been struggling with LinkedIn for months, but in just 30 minutes with her, I got more clarity than in all my previous efforts combined. She has a unique gift for identifying your strengths and showing you how to leverage them. Absolutely worth it!",
    ),
]


class Command(BaseCommand):
    help = "Seed the 31 Topmate testimonials + counts (use --replace to wipe first)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Delete existing testimonials before seeding",
        )

    def handle(self, *args, **options):
        if options["replace"]:
            Testimonial.objects.all().delete()
        created = 0
        for i, (name, date_label, text) in enumerate(REVIEWS):
            _, was_created = Testimonial.objects.get_or_create(
                name=name,
                date_label=date_label,
                text=text,
                defaults={"rating": 5, "is_visible": True, "sort_order": i},
            )
            if was_created:
                created += 1
        SiteSetting.objects.update_or_create(
            key="topmate_ratings_count", defaults={"value": "31"}
        )
        SiteSetting.objects.update_or_create(
            key="topmate_testimonials_count", defaults={"value": "31"}
        )
        SiteSetting.objects.update_or_create(
            key="topmate_url",
            defaults={"value": "https://topmate.io/kamna_bhardwaj"},
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created} new testimonials "
                f"({Testimonial.objects.count()} total, {len(REVIEWS)} in seed)."
            )
        )
