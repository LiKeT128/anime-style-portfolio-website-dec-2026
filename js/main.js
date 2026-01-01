document.addEventListener('DOMContentLoaded', () => {
    console.log('Portfolio Loaded. Discipline active.');

    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('toggle');
        });
    }

    // Smooth Scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            navLinks.classList.remove('active'); // Close mobile menu on click
            if (hamburger) hamburger.classList.remove('toggle');

            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });


    // Scroll Animations (Intersection Observer)
    const observerOptions = {
        threshold: 0.1, // Lower threshold to trigger earlier
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                entry.target.classList.remove('hidden-on-scroll'); // Remove hidden class
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.story-block, .skill-card, .project-card, .section-title, .contact-content');

    animatedElements.forEach(el => {
        observer.observe(el);
        // Only hide if we are sure JS is running roughly at start
        el.classList.add('hidden-on-scroll');
    });

    // Glassmorphism Header Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(15, 15, 30, 0.95)';
            navbar.style.boxShadow = '0 5px 20px rgba(0,0,0,0.5)';
        } else {
            navbar.style.background = 'rgba(15, 15, 30, 0.85)';
            navbar.style.boxShadow = 'none';
        }
    });

    // Localization Logic
    const langSwitcher = document.getElementById('lang-switcher');

    function updateLanguage(lang) {
        if (!translations[lang]) return;

        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang][key]) {
                // Check if it's an input/textarea placeholder or text content
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translations[lang][key];
                } else {
                    element.innerText = translations[lang][key];
                }
            }
        });

        localStorage.setItem('preferredLanguage', lang);
        if (langSwitcher) langSwitcher.value = lang;
    }

    if (langSwitcher) {
        const storedLang = localStorage.getItem('preferredLanguage') || 'en';
        updateLanguage(storedLang);

        langSwitcher.addEventListener('change', (e) => {
            updateLanguage(e.target.value);
        });
    }

});
