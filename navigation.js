(function () {
    'use strict';

    const state = {
        currentPage: 'pagina-cardapio',
        cardapioScrollY: 0,
        drawerTrigger: null
    };

    document.addEventListener('DOMContentLoaded', function () {
        const drawer = document.getElementById('menu-lateral');
        const backdrop = document.getElementById('menu-lateral-backdrop');
        const closeButton = document.getElementById('menu-lateral-fechar');
        const openButtons = Array.from(document.querySelectorAll('[data-open-drawer]'));
        const navigationItems = Array.from(document.querySelectorAll('[data-nav-page]'));

        if (!drawer || !backdrop || !closeButton) return;

        function pageIsAvailable(pageId) {
            return Boolean(document.getElementById(pageId)?.matches('[data-app-page]'));
        }

        function updateActiveItem(pageId) {
            navigationItems.forEach(function (item) {
                const active = item.dataset.navPage === pageId;
                item.classList.toggle('is-active', active);
                if (active) item.setAttribute('aria-current', 'page');
                else item.removeAttribute('aria-current');
            });
        }

        function openDrawer(trigger) {
            state.drawerTrigger = trigger || document.activeElement;
            drawer.classList.add('is-open');
            backdrop.classList.add('is-open');
            drawer.setAttribute('aria-hidden', 'false');
            backdrop.setAttribute('aria-hidden', 'false');
            document.body.classList.add('drawer-ativo');
            closeButton.focus({ preventScroll: true });
        }

        function closeDrawer(restoreFocus) {
            drawer.classList.remove('is-open');
            backdrop.classList.remove('is-open');
            drawer.setAttribute('aria-hidden', 'true');
            backdrop.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('drawer-ativo');
            if (restoreFocus !== false && state.drawerTrigger?.isConnected) {
                state.drawerTrigger.focus({ preventScroll: true });
            }
        }

        function showPage(pageId) {
            if (!pageIsAvailable(pageId)) return;
            const current = document.getElementById(state.currentPage);
            const target = document.getElementById(pageId);

            if (state.currentPage === 'pagina-cardapio') {
                state.cardapioScrollY = window.scrollY || document.documentElement.scrollTop || 0;
            }

            document.querySelectorAll('[data-app-page]').forEach(function (page) {
                const active = page.id === pageId;
                page.style.display = active ? 'block' : 'none';
                page.setAttribute('aria-hidden', String(!active));
            });

            state.currentPage = pageId;
            document.body.classList.toggle('info-ativo', pageId !== 'pagina-cardapio');
            updateActiveItem(pageId);
            closeDrawer(false);

            requestAnimationFrame(function () {
                if (pageId === 'pagina-cardapio') {
                    window.scrollTo(0, state.cardapioScrollY || 0);
                    window.atualizarAlturaNavegacao?.();
                } else {
                    window.scrollTo(0, 0);
                    const heading = target.querySelector('h1');
                    if (heading) {
                        heading.tabIndex = -1;
                        heading.focus({ preventScroll: true });
                    }
                }
            });
        }

        openButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                openDrawer(button);
            });
        });

        navigationItems.forEach(function (item) {
            item.addEventListener('click', function () {
                showPage(item.dataset.navPage);
            });
        });

        closeButton.addEventListener('click', function () {
            closeDrawer(true);
        });

        backdrop.addEventListener('click', function () {
            closeDrawer(true);
        });

        drawer.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                closeDrawer(false);
            });
        });

        document.addEventListener('keydown', function (event) {
            if (!drawer.classList.contains('is-open')) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                closeDrawer(true);
                return;
            }
            if (event.key !== 'Tab') return;

            const focusable = Array.from(drawer.querySelectorAll('button:not([disabled]), a[href]'));
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        document.getElementById('pagina-cardapio')?.setAttribute('aria-hidden', 'false');
        updateActiveItem(state.currentPage);

        window.appNavigation = {
            showPage: showPage,
            openDrawer: openDrawer,
            closeDrawer: closeDrawer,
            getCurrentPage: function () { return state.currentPage; }
        };
    });
})();
