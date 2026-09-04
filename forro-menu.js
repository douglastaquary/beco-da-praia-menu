(function () {
    'use strict';

    const TIME_ZONE = 'America/Sao_Paulo';
    const params = new URLSearchParams(window.location.search);
    const forcedMode = params.get('modo');

    function isTuesdayInSaoPaulo(date) {
        try {
            return new Intl.DateTimeFormat('en-US', {
                timeZone: TIME_ZONE,
                weekday: 'short'
            }).format(date) === 'Tue';
        } catch (error) {
            return date.getDay() === 2;
        }
    }

    function getMode() {
        if (forcedMode === 'forro') return { active: true, source: 'preview' };
        if (forcedMode === 'normal') return { active: false, source: 'preview' };
        return { active: isTuesdayInSaoPaulo(new Date()), source: 'calendar' };
    }

    function reorder(parent, ids) {
        if (!parent) return;
        ids.forEach(function (id) {
            const element = document.getElementById(id);
            if (element && element.parentElement === parent) parent.appendChild(element);
        });
    }

    function reorderCategoryLinks() {
        const navigation = document.querySelector('.divCategorias');
        if (!navigation) return;

        [
            'forro-destaques',
            'caipirinhas-do-beco',
            'entradinhas',
            'porcoes-do-beco',
            'bem-nordestinos',
            'cervejas',
            'mais-pedidos',
            'combos',
            'pratos-executivos',
            'pasteis-gigantes-20-cm',
            'sobremesas',
            'cachacas-do-beco'
        ].forEach(function (id) {
            const link = navigation.querySelector(`.cardCategoria[href="#${id}"]`);
            if (link) navigation.appendChild(link);
        });
    }

    function reorderProducts(categoryId, titles) {
        const category = document.getElementById(categoryId);
        const list = category?.querySelector('.produtos');
        if (!list) return;
        titles.forEach(function (title) {
            const product = findProduct(categoryId, title);
            if (product) list.appendChild(product);
        });
    }

    function addProductHighlights() {
        document.querySelectorAll('[data-forro-destaque]').forEach(function (product) {
            product.classList.add('forro-produto-destaque');

            const badge = document.createElement('span');
            badge.className = 'forro-produto-badge';
            badge.textContent = product.dataset.forroDestaque;

            const title = product.querySelector('.listaProdutoTitulo');
            if (title) title.insertAdjacentElement('beforebegin', badge);
            else product.querySelector('.divCardProduto')?.prepend(badge);

            if (product.hasAttribute('data-forro-promocao')) {
                const promotion = document.createElement('div');
                promotion.className = 'forro-produto-promocao';
                const message = product.dataset.forroPromocao || 'Leve 2 caldinhos por R$ 19,90';
                promotion.innerHTML = '<strong>Terça do Forró</strong><span></span>';
                promotion.querySelector('span').textContent = message;
                product.querySelector('.divCardProduto')?.appendChild(promotion);
            }
        });
    }

    function findProduct(categoryId, title) {
        const category = document.getElementById(categoryId);
        if (!category || !title) return null;
        return Array.from(category.querySelectorAll('.produtoContainer')).find(function (product) {
            return product.querySelector('.listaProdutoTitulo')?.textContent.trim() === title;
        }) || null;
    }

    function scrollToHighlight(trigger) {
        const categoryId = trigger.dataset.forroCategory;
        const productTitle = trigger.dataset.forroScroll;
        const product = findProduct(categoryId, productTitle);

        if (product) {
            product.scrollIntoView({ behavior: 'smooth', block: 'center' });
            product.classList.remove('forro-produto-pulso');
            window.setTimeout(function () {
                product.classList.add('forro-produto-pulso');
            }, 350);
            window.setTimeout(function () {
                product.classList.remove('forro-produto-pulso');
            }, 2300);
            return;
        }

        if (categoryId && typeof window.selecionarCategoria === 'function') {
            window.selecionarCategoria(categoryId, true);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        const mode = getMode();
        document.body.dataset.cardapioMode = mode.active ? 'forro' : 'normal';

        document.querySelectorAll('[data-forro-only]').forEach(function (element) {
            element.hidden = !mode.active;
            if (element.id === 'forro-destaques') {
                element.setAttribute('aria-hidden', String(!mode.active));
            }
        });
        document.querySelectorAll('[data-forro-hide]').forEach(function (element) {
            element.hidden = mode.active;
        });

        if (!mode.active) {
            window.becoForroMenu = { active: false, source: mode.source, timeZone: TIME_ZONE };
            return;
        }

        document.title = 'Terça do Forró - Cardápio Beco da Praia';

        const caipirinhas = document.getElementById('caipirinhas-do-beco');
        const caipirinhasTitle = caipirinhas?.querySelector('.cardapioSubcategoriaTitulo');
        if (caipirinhasTitle) {
            caipirinhasTitle.className = 'cardapioCategoriaTitulo';
            if (!caipirinhas.querySelector('.cardapioCategoriaDescricao')) {
                const description = document.createElement('p');
                description.className = 'cardapioCategoriaDescricao';
                description.textContent = 'As mais pedidas da terça: Rapadura e Goiabada com limão por R$ 34,90.';
                caipirinhasTitle.insertAdjacentElement('afterend', description);
            }
        }

        reorder(document.querySelector('.mainCard'), [
            'caipirinhas-do-beco',
            'entradinhas',
            'porcoes-do-beco',
            'bem-nordestinos',
            'cervejas',
            'coqueteis',
            'agua-e-refrigerantes',
            'sucos',
            'mais-pedidos',
            'combos',
            'pratos-executivos',
            'extras',
            'pasteis-gigantes-20-cm',
            'sobremesas',
            'cachacas-do-beco',
            'testes-online'
        ]);
        reorderCategoryLinks();
        reorderProducts('caipirinhas-do-beco', [
            'Rapadura',
            'Goiabada com limão',
            'Tradicional',
            'De frutas',
            'Cajú Amigo',
            'Caipirinhas especiais',
            'Manga com pimenta'
        ]);
        reorderProducts('entradinhas', [
            'Caldinho de feijão',
            'Torresmo',
            'Batata frita',
            'Dadinho de tapioca',
            'Pastelzinhos do Beco',
            'Importante'
        ]);
        reorderProducts('porcoes-do-beco', [
            'Mix de churrasco',
            'Isca de peixe',
            'Carne de sol'
        ]);
        reorderProducts('bem-nordestinos', [
            'Mocotó simples',
            'Mocotó (Prato individual)',
            'Dobradinha (Prato individual)'
        ]);
        addProductHighlights();

        document.querySelectorAll('[data-forro-category]').forEach(function (trigger) {
            trigger.addEventListener('click', function (event) {
                event.preventDefault();
                scrollToHighlight(trigger);
            });
        });

        if (typeof window.selecionarCategoria === 'function') {
            window.selecionarCategoria('forro-destaques', false);
        }
        window.atualizarAlturaNavegacao?.();
        window.becoForroMenu = { active: true, source: mode.source, timeZone: TIME_ZONE };
    });
})();
