(function () {
    'use strict';

    const STORAGE_KEY = 'beco-layout-v2';
    const params = new URLSearchParams(window.location.search);
    const GROUP_BY_CATEGORY = {
        cervejas: 'cervejas',
        'caipirinhas-do-beco': 'caipirinhas',
        coqueteis: 'caipirinhas',
        'agua-e-refrigerantes': 'sem-alcool',
        sucos: 'sem-alcool',
        'cachacas-do-beco': 'cachacas',
        'forro-destaques': 'forro'
    };

    let activePrimaryGroup = 'cardapio';
    let syncingPrimaryGroup = false;
    let cervejaTabsController = null;

    function centerScrollChild(child, container) {
        if (!child || !container) return;
        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        if (maxScroll <= 0) {
            if (container.scrollLeft !== 0) container.scrollTo({ left: 0, behavior: 'smooth' });
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const childRect = child.getBoundingClientRect();
        const delta = (childRect.left + childRect.width / 2) - (containerRect.left + containerRect.width / 2);
        const target = Math.min(maxScroll, Math.max(0, container.scrollLeft + delta));

        container.scrollTo({
            left: target,
            behavior: 'smooth'
        });
    }

    function groupsConfig() {
        return window.BECO_LAYOUT_V2?.groups || {};
    }

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

    function findProductInMenu(categoryId, productTitle) {
        const category = document.getElementById(categoryId);
        if (!category || !productTitle) return null;
        return Array.from(category.querySelectorAll('.produtoContainer')).find(function (product) {
            return product.querySelector('.listaProdutoTitulo')?.textContent.trim() === productTitle;
        }) || null;
    }

    function revealCervejaPanelForProduct(product) {
        const panelEl = product?.closest('.layout-v2-cerveja-panel');
        if (!panelEl || !cervejaTabsController) return;
        const tabId = panelEl.dataset.cervejaPanel;
        if (tabId) cervejaTabsController.setActiveCervejaTab(tabId, { center: true });
    }

    function pulseProduct(product) {
        if (!product) return;
        window.requestAnimationFrame(function () {
            const stickyNav = document.querySelector('.cardapio-navegacao-sticky');
            const offset = (stickyNav?.offsetHeight || 0) + 12;
            const top = window.scrollY + product.getBoundingClientRect().top - offset;
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

            product.classList.remove('layout-v2-search-pulse');
            window.setTimeout(function () {
                product.classList.add('layout-v2-search-pulse');
            }, 280);
            window.setTimeout(function () {
                product.classList.remove('layout-v2-search-pulse');
            }, 2200);

            window.setTimeout(function () {
                product.click();
            }, 450);
        });
    }

    function scrollToMenuProduct(categoryId, productTitle) {
        const product = findProductInMenu(categoryId, productTitle);
        if (!product) {
            scrollToCategory(categoryId);
            return;
        }

        const group = categoryIdToPrimaryGroup(categoryId);
        if (group) applyPrimaryGroup(group, { scrollTo: false });

        if (categoryId && typeof window.selecionarCategoria === 'function') {
            window.selecionarCategoria(categoryId, false);
        }

        revealCervejaPanelForProduct(product);
        pulseProduct(product);
    }

    function categoryIdToPrimaryGroup(categoryId) {
        const groups = groupsConfig();
        if (document.body.dataset.cardapioMode === 'forro' && groups.forro?.includes(categoryId)) {
            return 'forro';
        }
        if (GROUP_BY_CATEGORY[categoryId]) return GROUP_BY_CATEGORY[categoryId];
        return 'cardapio';
    }

    function filterSecondaryNav(group) {
        const allowed = new Set(groupsConfig()[group] || []);
        document.querySelectorAll('.cardCategoria[href^="#"]').forEach(function (link) {
            if (link.hasAttribute('data-forro-only') && link.hidden) {
                link.classList.add('layout-v2-nav-hidden');
                return;
            }
            const id = link.getAttribute('href').replace('#', '');
            const show = allowed.has(id);
            link.classList.toggle('layout-v2-nav-hidden', !show);
            if (show && link.classList.contains('layout-v2-only')) {
                link.hidden = false;
            }
        });
        updateNavHeights();

        // Centraliza a tab primária ativa sem deixar faixa vazia
        const activeTab = document.querySelector('.layout-v2-primary-tab.is-active');
        const track = document.querySelector('.layout-v2-primary-track');
        if (activeTab && track) {
            window.requestAnimationFrame(function () {
                centerScrollChild(activeTab, track);
            });
        }
    }

    function applyPrimaryGroup(group, options) {
        const opts = options || {};
        if (!groupsConfig()[group]) return;

        activePrimaryGroup = group;
        syncingPrimaryGroup = true;

        const tab = document.querySelector('.layout-v2-primary-tab[data-layout-group="' + group + '"]:not([hidden])');
        if (tab && window.layoutV2SetPrimaryTab) {
            window.layoutV2SetPrimaryTab(tab);
        }

        filterSecondaryNav(group);

        if (opts.scrollTo !== false && tab?.dataset.layoutTarget) {
            scrollToCategory(tab.dataset.layoutTarget);
        }

        window.setTimeout(function () {
            syncingPrimaryGroup = false;
        }, 120);
    }

    function syncPrimaryFromCategoryId(categoryId) {
        if (syncingPrimaryGroup || !categoryId) return;
        const group = categoryIdToPrimaryGroup(categoryId);
        if (group === activePrimaryGroup) return;
        applyPrimaryGroup(group, { scrollTo: false });
    }

    function hookCategorySelection() {
        const original = window.selecionarCategoria;
        if (!original || original.__layoutV2Wrapped) return;

        function wrappedSelectCategory(id, rolar) {
            original(id, rolar);
            syncPrimaryFromCategoryId(id);
            cervejaTabsController?.syncCategory(id);
        }
        wrappedSelectCategory.__layoutV2Wrapped = true;
        window.selecionarCategoria = wrappedSelectCategory;
    }

    function updateNavHeights() {
        const stickyNav = document.querySelector('.cardapio-navegacao-sticky');
        const pagina = document.getElementById('pagina-cardapio');
        if (!pagina) return;

        window.atualizarAlturaNavegacao?.();

        const navHeight = stickyNav?.offsetHeight || 0;
        pagina.style.setProperty('--layout-v2-nav-height', navHeight + 'px');
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
                const targetId = button.dataset.layoutScroll || '';
                const productTitle = button.dataset.layoutProduct || '';
                if (productTitle) {
                    scrollToMenuProduct(targetId, productTitle);
                    return;
                }
                const group = categoryIdToPrimaryGroup(targetId);
                applyPrimaryGroup(group, { scrollTo: false });
                scrollToCategory(targetId);
            });
        });

        collectSlides();
        return { refresh: collectSlides, goTo: goTo };
    }

    function initPrimaryTabs(primaryNav) {
        const track = primaryNav.querySelector('.layout-v2-primary-track');
        const tabs = Array.from(primaryNav.querySelectorAll('.layout-v2-primary-tab'));

        function setActiveTab(tab) {
            tabs.forEach(function (item) {
                item.classList.toggle('is-active', item === tab);
            });
            if (tab && track) {
                window.requestAnimationFrame(function () {
                    centerScrollChild(tab, track);
                });
            }
        }

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                const group = tab.dataset.layoutGroup || 'cardapio';
                applyPrimaryGroup(group, { scrollTo: false });
                scrollToCategory(tab.dataset.layoutTarget || '');
                setActiveTab(tab);
            });
        });

        window.layoutV2SetPrimaryTab = setActiveTab;
    }

    function initCervejaTabs() {
        const section = document.getElementById('cervejas');
        const produtos = section?.querySelector('.produtos');
        if (!section || !produtos || produtos.dataset.cervejaTabsReady === '1') {
            return cervejaTabsController;
        }

        const TAB_DEFS = [
            { id: '600ml', label: '600 ml' },
            { id: 'longneck', label: 'Long neck' },
            { id: 'lata-269', label: 'Lata 269' },
            { id: 'lata-350', label: 'Lata 350' }
        ];

        function tabIdForProduct(product) {
            const desc = product.querySelector('.threeDots')?.textContent || '';
            if (/long neck/i.test(desc)) return 'longneck';
            if (/350 ml/i.test(desc)) return 'lata-350';
            if (/269 ml/i.test(desc)) return 'lata-269';
            return '600ml';
        }

        const panels = {};
        TAB_DEFS.forEach(function (def) {
            const panel = document.createElement('div');
            panel.className = 'layout-v2-cerveja-panel';
            panel.dataset.cervejaPanel = def.id;
            panel.hidden = def.id !== '600ml';
            panels[def.id] = panel;
        });

        produtos.querySelectorAll('.produtoContainer').forEach(function (product) {
            panels[tabIdForProduct(product)].appendChild(product);
        });

        produtos.querySelectorAll('.cervejasSubcategoria').forEach(function (heading) {
            heading.remove();
        });

        TAB_DEFS.forEach(function (def) {
            produtos.appendChild(panels[def.id]);
        });

        const nav = document.createElement('nav');
        nav.className = 'layout-v2-cerveja-tabs';
        nav.hidden = true;
        nav.setAttribute('aria-label', 'Tipos de cerveja');

        const track = document.createElement('div');
        track.className = 'layout-v2-cerveja-track';

        let activeCervejaTab = '600ml';

        function setActiveCervejaTab(tabId, options) {
            const opts = options || {};
            if (!panels[tabId]) return;
            activeCervejaTab = tabId;

            TAB_DEFS.forEach(function (def) {
                panels[def.id].hidden = def.id !== tabId;
            });

            track.querySelectorAll('.layout-v2-cerveja-tab').forEach(function (button) {
                const isActive = button.dataset.cervejaTab === tabId;
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-selected', String(isActive));
                if (isActive && opts.center !== false) {
                    window.requestAnimationFrame(function () {
                        centerScrollChild(button, track);
                    });
                }
            });

            updateNavHeights();
        }

        TAB_DEFS.forEach(function (def) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'layout-v2-cerveja-tab' + (def.id === '600ml' ? ' is-active' : '');
            button.dataset.cervejaTab = def.id;
            button.textContent = def.label;
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', String(def.id === '600ml'));
            button.addEventListener('click', function () {
                setActiveCervejaTab(def.id);
                if (typeof window.selecionarCategoria === 'function') {
                    window.selecionarCategoria('cervejas', false);
                }
            });
            track.appendChild(button);
        });

        nav.appendChild(track);

        const menuMobile = document.querySelector('.cardapio-nav-inner > .menuMobile');
        if (menuMobile?.parentNode) {
            menuMobile.parentNode.insertBefore(nav, menuMobile.nextSibling);
        }

        produtos.dataset.cervejaTabsReady = '1';

        cervejaTabsController = {
            nav: nav,
            syncCategory: function (categoryId) {
                const visible = categoryId === 'cervejas';
                nav.hidden = !visible;
                if (visible) {
                    setActiveCervejaTab(activeCervejaTab, { center: false });
                } else {
                    updateNavHeights();
                }
            },
            setActiveCervejaTab: setActiveCervejaTab
        };

        return cervejaTabsController;
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
        const closeButton = document.getElementById('layout-v2-search-close');
        const results = document.getElementById('layout-v2-search-results');
        if (!toggle || !panel || !input || !results) return;

        toggle.hidden = false;
        const SKIP_TITLES = new Set(['Importante', 'Disponibilidade', 'Informação']);

        function setPanelOpen(open) {
            panel.hidden = !open;
            toggle.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('layout-v2-search-open', open);

            if (!open) {
                input.value = '';
                clearResults();
                document.querySelectorAll('.produtoContainer.layout-v2-search-hidden').forEach(function (product) {
                    product.classList.remove('layout-v2-search-hidden');
                });
                document.body.classList.remove('layout-v2-search-active');
                const emptyState = document.getElementById('layout-v2-search-empty');
                if (emptyState) emptyState.hidden = true;
            } else {
                input.focus({ preventScroll: true });
            }

            updateNavHeights();
        }

        function clearResults() {
            results.innerHTML = '';
            results.hidden = true;
        }

        function collectMatches(query) {
            const normalized = query.trim().toLowerCase();
            if (!normalized) return [];

            const matches = [];
            document.querySelectorAll('#pagina-cardapio .produtoContainer').forEach(function (product) {
                if (product.classList.contains('cachacas-chamada')) return;
                if (product.hidden) return;

                const title = product.querySelector('.listaProdutoTitulo')?.textContent.trim() || '';
                if (!title || SKIP_TITLES.has(title)) return;

                const description = product.querySelector('.threeDots')?.textContent.trim() || '';
                const price = Array.from(product.querySelectorAll('.divCardProduto p'))
                    .map(function (node) { return node.textContent.trim(); })
                    .find(function (text) { return /^R\$|Dose|Litro|MEIA|INTEIRA|UNID/i.test(text); }) || '';

                if (
                    title.toLowerCase().includes(normalized)
                    || description.toLowerCase().includes(normalized)
                ) {
                    const category = product.closest('.cardapioCategoria');
                    matches.push({
                        product: product,
                        title: title,
                        description: description,
                        price: price,
                        categoryId: category?.id || '',
                        categoryLabel: category?.querySelector('.cardapioCategoriaTitulo, .cardapioSubcategoriaTitulo')?.textContent.trim() || ''
                    });
                }
            });

            return matches.slice(0, 12);
        }

        function renderResults(query) {
            const normalized = query.trim();
            document.body.classList.toggle('layout-v2-search-active', Boolean(normalized));

            if (!normalized) {
                clearResults();
                return;
            }

            const matches = collectMatches(normalized);
            results.innerHTML = '';
            results.hidden = false;

            if (!matches.length) {
                const empty = document.createElement('p');
                empty.className = 'layout-v2-search-empty';
                empty.textContent = 'Nenhum item encontrado. Tente outro nome.';
                results.appendChild(empty);
                return;
            }

            matches.forEach(function (match) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'layout-v2-search-result';
                button.setAttribute('role', 'option');

                const img = match.product.querySelector('img.imagemProduto');
                const thumb = document.createElement('span');
                thumb.className = 'layout-v2-search-result-thumb';
                if (img?.src) {
                    const image = document.createElement('img');
                    image.src = img.currentSrc || img.src;
                    image.alt = '';
                    thumb.appendChild(image);
                }

                const info = document.createElement('span');
                info.className = 'layout-v2-search-result-info';
                info.innerHTML = '<strong></strong><small></small>';
                info.querySelector('strong').textContent = match.title;
                info.querySelector('small').textContent = match.categoryLabel
                    || match.description.slice(0, 80)
                    || match.price;

                const price = document.createElement('span');
                price.className = 'layout-v2-search-result-price';
                price.textContent = match.price.replace(/^[^R$]*/, function (prefix) {
                    return prefix;
                }).split('\n')[0].slice(0, 28);

                button.appendChild(thumb);
                button.appendChild(info);
                button.appendChild(price);

                button.addEventListener('click', function () {
                    goToProduct(match);
                });

                results.appendChild(button);
            });
        }

        function revealCervejaPanelIfNeeded(product) {
            revealCervejaPanelForProduct(product);
        }

        function goToProduct(match) {
            setPanelOpen(false);
            scrollToMenuProduct(match.categoryId, match.title);
        }

        toggle.addEventListener('click', function () {
            setPanelOpen(panel.hidden);
        });

        closeButton?.addEventListener('click', function () {
            setPanelOpen(false);
        });

        input.addEventListener('input', function () {
            renderResults(input.value);
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !panel.hidden) setPanelOpen(false);
        });
    }

    function initProductEnhancements() {
        document.querySelectorAll('#pagina-cardapio .produtoContainer').forEach(function (product) {
            if (product.classList.contains('cachacas-chamada')) return;

            const card = product.querySelector('.divCardProduto');
            const title = product.querySelector('.listaProdutoTitulo')?.textContent.trim();
            const description = product.querySelector('.threeDots')?.textContent.trim();
            if (!card || !title || title === 'Importante' || title === 'Disponibilidade' || title === 'Informação') {
                return;
            }

            product.classList.add('layout-v2-product-row');

            const destaqueLabel = product.dataset.layoutV2Destaque;
            if (destaqueLabel && !product.querySelector('.layout-v2-destaque-badge')) {
                const badge = document.createElement('span');
                badge.className = 'layout-v2-destaque-badge';
                badge.textContent = destaqueLabel;
                const title = product.querySelector('.listaProdutoTitulo');
                if (title) title.insertAdjacentElement('beforebegin', badge);
                else card.prepend(badge);
            }

            const priceBlocks = Array.from(card.querySelectorAll(':scope > div[style*="flex-direction: row"]'));
            if (priceBlocks.length > 1 && !card.querySelector('.layout-v2-price-stack')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'layout-v2-price-stack';
                priceBlocks.forEach(function (block) {
                    wrapper.appendChild(block);
                });
                card.appendChild(wrapper);
            }

            if (!product.querySelector('.layout-v2-saiba-mais') && description) {
                const link = document.createElement('button');
                link.type = 'button';
                link.className = 'layout-v2-saiba-mais';
                link.textContent = 'Saiba mais';
                card.appendChild(link);
            }
        });
    }

    function syncForroUI(carousel) {
        const isForro = document.body.dataset.cardapioMode === 'forro';
        const forroPrimaryTab = document.querySelector('.layout-v2-primary-tab[data-layout-group="forro"]');

        document.querySelectorAll('.layout-v2-hero-slide[data-forro-only]').forEach(function (slide) {
            slide.hidden = !isForro;
        });
        if (forroPrimaryTab) forroPrimaryTab.hidden = !isForro;

        carousel?.refresh();

        if (isForro && activePrimaryGroup === 'cardapio') {
            applyPrimaryGroup('forro', { scrollTo: false });
        } else if (!isForro && activePrimaryGroup === 'forro') {
            applyPrimaryGroup('cardapio', { scrollTo: false });
        } else {
            filterSecondaryNav(activePrimaryGroup);
        }

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
        const primaryNav = document.querySelector('.layout-v2-primary');
        if (shell) {
            shell.hidden = false;
            shell.setAttribute('aria-hidden', 'false');
        }
        if (primaryNav) {
            primaryNav.hidden = false;
        }

        document.querySelectorAll('.cardCategoria.layout-v2-only').forEach(function (link) {
            link.hidden = false;
        });
        const caipiLink = document.querySelector('.cardCategoria[href="#caipirinhas-do-beco"]');
        if (caipiLink) {
            caipiLink.hidden = false;
            caipiLink.removeAttribute('data-forro-only');
        }

        hookCategorySelection();

        const carousel = initHeroCarousel(shell || document);
        if (primaryNav) initPrimaryTabs(primaryNav);
        initVenueActions();
        initSearch();
        initProductEnhancements();
        cervejaTabsController = initCervejaTabs();
        syncForroUI(carousel);
        applyPrimaryGroup(document.body.dataset.cardapioMode === 'forro' ? 'forro' : 'cardapio', { scrollTo: false });
        cervejaTabsController?.syncCategory(document.body.dataset.cardapioMode === 'forro' ? 'forro-destaques' : 'mais-pedidos');
        updateNavHeights();

        const navInner = document.querySelector('.cardapio-nav-inner');
        const stickyNav = document.querySelector('.cardapio-navegacao-sticky');
        if (window.ResizeObserver) {
            if (navInner) new ResizeObserver(updateNavHeights).observe(navInner);
            if (stickyNav) new ResizeObserver(updateNavHeights).observe(stickyNav);
        }

        window.addEventListener('resize', updateNavHeights);

        const observer = new MutationObserver(function () {
            syncForroUI(carousel);
            initProductEnhancements();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-cardapio-mode'] });

        window.becoLayoutV2 = {
            active: true,
            scrollToCategory: scrollToCategory,
            updateNavHeights: updateNavHeights,
            applyPrimaryGroup: applyPrimaryGroup,
            centerScrollChild: centerScrollChild,
            updateCervejaTabs: function (categoryId) {
                cervejaTabsController?.syncCategory(categoryId);
            }
        };
    });
})();
