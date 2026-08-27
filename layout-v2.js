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

    function updateNavHeights() {
        const header = document.querySelector('.cardapio-nav-inner > .header-cardapio');
        const categories = document.querySelector('.cardapio-nav-inner > .menuMobile');
        const pagina = document.getElementById('pagina-cardapio');
        if (!pagina) return;

        const headerHeight = header?.offsetHeight || 0;
        const categoriesHeight = categories?.offsetHeight || 0;
        pagina.style.setProperty('--layout-v2-header-height', `${headerHeight}px`);
        pagina.style.setProperty('--layout-v2-categories-height', `${categoriesHeight}px`);
        window.atualizarAlturaNavegacao?.();
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
            restartAutoplay();
        }

        function renderDots() {
            dotsHost.innerHTML = '';
            if (slides.length < 2) return;
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

        window.layoutV2SetPrimaryTab = setActiveTab;
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

    function initSearch() {
        const toggle = document.querySelector('.layout-v2-search-toggle');
        const panel = document.getElementById('layout-v2-search-panel');
        const input = document.getElementById('layout-v2-search-input');
        const clearButton = document.getElementById('layout-v2-search-clear');
        if (!toggle || !panel || !input) return;

        toggle.hidden = false;

        function setPanelOpen(open) {
            panel.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            if (open) input.focus({ preventScroll: true });
            else input.value = '';
            filterProducts('');
            updateNavHeights();
        }

        function filterProducts(query) {
            const normalized = query.trim().toLowerCase();
            const products = document.querySelectorAll('#pagina-cardapio .produtoContainer');
            let visibleCount = 0;

            products.forEach(function (product) {
                const title = product.querySelector('.listaProdutoTitulo')?.textContent.trim() || '';
                const description = product.querySelector('.threeDots')?.textContent.trim() || '';
                const matches = !normalized
                    || title.toLowerCase().includes(normalized)
                    || description.toLowerCase().includes(normalized);
                product.classList.toggle('layout-v2-search-hidden', !matches);
                if (matches) visibleCount += 1;
            });

            document.body.classList.toggle('layout-v2-search-active', Boolean(normalized));
            if (clearButton) clearButton.hidden = !normalized;

            let emptyState = document.getElementById('layout-v2-search-empty');
            if (normalized && visibleCount === 0) {
                if (!emptyState) {
                    emptyState = document.createElement('p');
                    emptyState.id = 'layout-v2-search-empty';
                    emptyState.className = 'layout-v2-search-empty';
                    emptyState.textContent = 'Nenhum item encontrado. Tente outro nome.';
                    document.querySelector('.mainCard')?.prepend(emptyState);
                }
                emptyState.hidden = false;
            } else if (emptyState) {
                emptyState.hidden = true;
            }
        }

        toggle.addEventListener('click', function () {
            setPanelOpen(panel.hidden);
        });

        input.addEventListener('input', function () {
            filterProducts(input.value);
        });

        clearButton?.addEventListener('click', function () {
            input.value = '';
            filterProducts('');
            input.focus({ preventScroll: true });
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !panel.hidden) setPanelOpen(false);
        });
    }

    function initProductEnhancements() {
        document.querySelectorAll('#pagina-cardapio .produtoContainer').forEach(function (product) {
            if (product.querySelector('.layout-v2-saiba-mais')) return;

            const card = product.querySelector('.divCardProduto');
            const title = product.querySelector('.listaProdutoTitulo')?.textContent.trim();
            const description = product.querySelector('.threeDots')?.textContent.trim();
            if (!card || !title || title === 'Importante' || title === 'Disponibilidade' || title === 'Informação') return;

            const priceBlocks = Array.from(card.querySelectorAll(':scope > div[style*="flex-direction: row"]'));
            if (priceBlocks.length > 1) {
                const wrapper = document.createElement('div');
                wrapper.className = 'layout-v2-price-stack';
                priceBlocks.forEach(function (block) {
                    wrapper.appendChild(block);
                });
                card.appendChild(wrapper);
            }

            if (description) {
                const link = document.createElement('button');
                link.type = 'button';
                link.className = 'layout-v2-saiba-mais';
                link.textContent = 'Saiba mais';
                link.addEventListener('click', function (event) {
                    event.stopPropagation();
                    product.classList.toggle('layout-v2-expanded');
                    link.textContent = product.classList.contains('layout-v2-expanded') ? 'Ver menos' : 'Saiba mais';
                });
                card.appendChild(link);
            }
        });
    }

    function syncForroUI(carousel) {
        const isForro = document.body.dataset.cardapioMode === 'forro';
        const forroSlide = document.querySelector('.layout-v2-hero-slide[data-forro-only]');
        const forroPrimaryTab = document.querySelector('.layout-v2-primary-tab[data-layout-target="forro-destaques"]');
        const forroCategoryLink = document.querySelector('.cardCategoria[href="#forro-destaques"]');

        if (forroSlide) forroSlide.hidden = !isForro;
        if (forroPrimaryTab) forroPrimaryTab.hidden = !isForro;
        if (forroCategoryLink) forroCategoryLink.hidden = !isForro;

        carousel?.refresh();
        updateNavHeights();
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
        initSearch();
        initProductEnhancements();
        syncForroUI(carousel);
        updateNavHeights();

        const navInner = document.querySelector('.cardapio-nav-inner');
        if (navInner && window.ResizeObserver) {
            new ResizeObserver(updateNavHeights).observe(navInner);
        }

        window.addEventListener('resize', updateNavHeights);

        const observer = new MutationObserver(function () {
            syncForroUI(carousel);
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-cardapio-mode'] });

        window.becoLayoutV2 = { active: true, scrollToCategory: scrollToCategory, updateNavHeights: updateNavHeights };
    });
})();
