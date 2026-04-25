document.addEventListener("DOMContentLoaded", () => {
    const navbar = document.getElementById("navbar");
    const navToggle = document.getElementById("navToggle");
    const navPanel = document.getElementById("navPanel");
    const navLinks = Array.from(document.querySelectorAll(".nav-link"));
    const sections = Array.from(document.querySelectorAll("main section[id]"));
    const revealItems = document.querySelectorAll(".reveal");
    const floatingSocial = document.getElementById("floatingSocial");
    const floatingSocialToggle = document.getElementById("floatingSocialToggle");
    const interactiveImages = document.querySelectorAll(
        ".portrait-frame, .mini-profile img, .hero-badge img, .campaign-header-right img"
    );

    const syncNavbar = () => {
        navbar.classList.toggle("is-scrolled", window.scrollY > 24);
    };

    const closeMenu = () => {
        navPanel.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.classList.remove("is-open");
    };

    if (navToggle && navPanel) {
        navToggle.addEventListener("click", () => {
            const isOpen = navPanel.classList.toggle("is-open");
            navToggle.setAttribute("aria-expanded", String(isOpen));
            navToggle.classList.toggle("is-open", isOpen);
        });

        navLinks.forEach((link) => {
            link.addEventListener("click", () => {
                if (window.innerWidth <= 900) {
                    closeMenu();
                }
            });
        });

        document.addEventListener("click", (event) => {
            if (window.innerWidth > 900 || !navPanel.classList.contains("is-open")) {
                return;
            }

            if (navPanel.contains(event.target) || navToggle.contains(event.target)) {
                return;
            }

            closeMenu();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && navPanel.classList.contains("is-open")) {
                closeMenu();
            }
        });
    }

    if (floatingSocial && floatingSocialToggle) {
        const closeFloatingSocial = () => {
            floatingSocial.classList.remove("is-open");
            floatingSocialToggle.setAttribute("aria-expanded", "false");
        };

        floatingSocialToggle.addEventListener("click", () => {
            const isOpen = floatingSocial.classList.toggle("is-open");
            floatingSocialToggle.setAttribute("aria-expanded", String(isOpen));
        });

        document.addEventListener("click", (event) => {
            if (!floatingSocial.classList.contains("is-open")) {
                return;
            }

            if (floatingSocial.contains(event.target)) {
                return;
            }

            closeFloatingSocial();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && floatingSocial.classList.contains("is-open")) {
                closeFloatingSocial();
            }
        });
    }

    interactiveImages.forEach((element) => {
        const pressOn = () => element.classList.add("is-pressed");
        const pressOff = () => element.classList.remove("is-pressed");

        element.addEventListener("touchstart", pressOn, { passive: true });
        element.addEventListener("touchend", pressOff, { passive: true });
        element.addEventListener("touchcancel", pressOff, { passive: true });
    });

    const sectionObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                const currentId = entry.target.getAttribute("id");
                navLinks.forEach((link) => {
                    link.classList.toggle("active", link.getAttribute("href") === `#${currentId}`);
                });
            });
        },
        {
            threshold: 0.45,
            rootMargin: "-15% 0px -25% 0px"
        }
    );

    sections.forEach((section) => sectionObserver.observe(section));

    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.14,
            rootMargin: "0px 0px -40px 0px"
        }
    );

    revealItems.forEach((item) => revealObserver.observe(item));

    window.addEventListener("scroll", syncNavbar, { passive: true });
    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) {
            closeMenu();
        }
    });

    syncNavbar();
});
