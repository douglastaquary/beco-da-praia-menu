(function () {
    'use strict';

    const STORAGE_KEY = 'beco-layout-v2';
    const params = new URLSearchParams(window.location.search);

    function isEnabled() {
        const layoutParam = params.get('layout');
        if (layoutParam === 'v2') return true;
        if (layoutParam === 'classic') return false;
        try {
            return localStorage.getItem(STORAGE_KEY) === 'on';
        } catch (error) {
            return false;
        }
    }

    function persistPreference(enabled) {
        try {
            if (enabled) localStorage.setItem(STORAGE_KEY, 'on');
            else localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            /* ignore */
        }
    }

    function scrollToCategory(categoryId) {
        if (typeof window.selecionarCategoria === 'function') {
            window.selecionarCategoria(categoryId, true);
            return;
        }
        const target = document.getElementById(categoryId);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function initHeroCarousel(root) {
        const track = root.querySelector('.layout-v2-hero-track');
        const dotsHost = root.querySelector('.layout-v2-hero-dots');
        if (!track || !dotsHost) return null;

        let slides = [];
        let index = 0;
        let timer = null;
        let touchStartX = 0;

        function collectSlides() {
            slides = Array.from(track.querySelectorAll('.layout-v2-hero-slide')).filter(function (slide) {
                return !slide.hidden;
            });
            if (!slides.length) return;
            if (!slides[index]) index = 0;
            slides.forEach(function (slide, slideIndex) {
                slide.classList.toggle('is-active', slideIndex === index);
            });
            renderDots();
        }

        function renderDots() {
            dotsHost.innerHTML = '';
            slides.forEach(function (_slide, dotIndex) {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'layout-v2-hero-dot' + (dotIndex === index ? ' is-active' : '');
                dot.setAttribute('aria-label', 'Ir para destaque ' + (dotIndex + 1));
                dot.addEventListener('click', function () {
                    goTo(dotIndex, true);
                });
                dotsHost.appendChild(dot);
            });
        }

        function goTo(nextIndex, userTriggered) {
            if (!slides.length) return;
            index = (nextIndex + slides.length) % slides.length;
            slides.forEach(function (slide, slideIndex) {
                slide.classList.toggle('is-active', slideIndex === index);
            });
            renderDots();
            if (userTriggered) restartAutoplay();
        }

        function restartAutoplay() {
            window.clearInterval(timer);
            if (slides.length < 2) return;
            timer = window.setInterval(function () {
                goTo(index + 1, false);
            }, window.BECO_LAYOUT_V2?.heroAutoplayMs || 5500);
        }

        track.addEventListener('touchstart', function (event) {
            touchStartX = event.changedTouches[0]?.clientX || 0;
        }, { passive: true });

        track.addEventListener('touchend', function (event) {
            const delta = (event.changedTouches[0]?.clientX || 0) - touchStartX;
            if (Math.abs(delta) < 40) return;
            goTo(index + (delta < 0 ? 1 : -1), true);
        }, { passive: true });

        root.querySelectorAll('[data-layout-scroll]').forEach(function (button) {
            button.addEventListener('click', function () {
                scrollToCategory(button.dataset.layoutScroll || '');
            });
        });

        collectSlides();
        restartAutoplay();

        return { refresh: collectSlides, goTo: goTo };
    }

    function initPrimaryTabs(shell) {
        const tabs = Array.from(shell.querySelectorAll('.layout-v2-primary-tab'));
        if (!tabs.length) return;

        function setActiveTab(tab) {
            tabs.forEach(function (item) {
                item.classList.toggle('is-active', item === tab);
            });
        }

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                setActiveTab(tab);
                scrollToCategory(tab.dataset.layoutTarget || '');
            });
        });

        document.addEventListener('scroll', function () {
            if (document.body.dataset.cardapioMode !== 'forro') return;
            const forroTab = tabs.find(function (tab) {
                return tab.dataset.layoutTarget === 'forro-destaques';
            });
            if (forroTab && !forroTab.hidden) setActiveTab(forroTab);
        }, { passive: true });
    }

    function initVenueActions() {
        const fontToggle = document.getElementById('layout-v2-font-toggle');
        const shareButton = document.getElementById('layout-v2-share');

        fontToggle?.addEventListener('click', function () {
            const enlarged = document.body.classList.toggle('layout-v2-text-lg');
            fontToggle.setAttribute('aria-pressed', String(enlarged));
        });

        shareButton?.addEventListener('click', async function () {
            const shareData = {
                title: 'Cardápio Beco da Praia',
                text: 'Confira o cardápio do Beco da Praia',
                url: window.location.href.split('?')[0] + '?layout=v2'
            };
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (error) {
                    /* user cancelled */
                }
                return;
            }
            try {
                await navigator.clipboard.writeText(shareData.url);
                shareButton.setAttribute('aria-label', 'Link copiado');
            } catch (error) {
                /* ignore */
            }
        });
    }

    function syncForroSlide(carousel) {
        const forroSlide = document.querySelector('.layout-v2-hero-slide[data-forro-only]');
        if (forroSlide) {
            forroSlide.hidden = document.body.dataset.cardapioMode !== 'forro';
        }
        carousel?.refresh();
    }

    document.addEventListener('DOMContentLoaded', function () {
        const enabled = isEnabled();
        if (params.get('layout') === 'v2') persistPreference(true);
        if (params.get('layout') === 'classic') persistPreference(false);

        if (!enabled) {
            document.documentElement.classList.remove('layout-v2-pending');
            return;
        }

        document.body.classList.add('layout-v2');
        document.documentElement.classList.remove('layout-v2-pending');

        const shell = document.querySelector('.layout-v2-shell');
        if (shell) {
            shell.hidden = false;
            shell.setAttribute('aria-hidden', 'false');
        }

        const carousel = initHeroCarousel(document);
        if (shell) initPrimaryTabs(shell);
        initVenueActions();
        syncForroSlide(carousel);

        const observer = new MutationObserver(function () {
            syncForroSlide(carousel);
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-cardapio-mode'] });

        window.becoLayoutV2 = { active: true, scrollToCategory: scrollToCategory };
    });
})();
