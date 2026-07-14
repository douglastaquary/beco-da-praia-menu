(function () {
    const API_BASE_URL = (window.BECO_ORDERS_API_BASE_URL || '').replace(/\/$/, '');
    const ORDER_ENDPOINT = `${API_BASE_URL}/orders`;
    const paymentMethods = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'];
    const productRules = {
        'entradinhas|Pastelzinhos do Beco': { orderable: false, message: 'Item disponível apenas com atendimento.' },
        'entradinhas|Torresmo': { orderable: false, message: 'Item disponível apenas com atendimento.' },
        'entradinhas|Queijo coalho com mel': { orderable: false, message: 'Item disponível apenas com atendimento.' },
        'entradinhas|Bolinhos da Casa Artesanal': { orderable: false, message: 'Item disponível apenas com atendimento.' },
        'mais-pedidos|Trio Nordestino (Serve 2 pessoas)': {
            requiredOptions: [meatDoneness()]
        },
        'porcoes-do-beco|Carne de sol': {
            derivedOptions: [sizeFromPrice()],
            requiredOptions: [sideDish(), meatDoneness()]
        },
        'porcoes-do-beco|Isca de peixe': {
            derivedOptions: [sizeFromPrice()],
            requiredOptions: [sideDish()]
        },
        'porcoes-do-beco|Mix de churrasco': {
            derivedOptions: [sizeFromPrice()],
            requiredOptions: [sideDish(), meatDoneness()]
        },
        'bem-nordestinos|Dobradinha (Prato individual)': {
            derivedOptions: [riceFromPrice()]
        },
        'bem-nordestinos|Mocotó (Prato individual)': {
            derivedOptions: [riceFromPrice()]
        },
        'bem-nordestinos|Panelinha de Língua (Prato individual)': {
            derivedOptions: [riceFromPrice()]
        },
        'pratos-executivos|Carne de sol': {
            requiredOptions: [meatDoneness()]
        },
        'pratos-executivos|Bife acebolado': {
            requiredOptions: [meatDoneness()]
        },
        'extras|Arroz branco': {
            derivedOptions: [riceSizeFromPrice()]
        }
    };
    const nonOrderableTitles = new Set([
        'Importante',
        'Disponibilidade',
        'Informação',
        'Adicionais (consulte no balcão)',
        'Caipirinhas especiais',
        'Cachaças'
    ]);
    const state = {
        currentProduct: null,
        items: [],
        cardapioScrollY: 0
    };

    document.addEventListener('DOMContentLoaded', function () {
        createProductDetailUi();
        createCartUi();
        updateCartUi();
    });

    document.addEventListener('click', function (event) {
        const product = event.target.closest('.produtoContainer');
        if (!product || event.target.closest('.pedido-carrinho') || event.target.closest('.pagina-detalhe-produto')) {
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        state.currentProduct = readProduct(product);
        showProductDetail();
    }, true);

    function readProduct(product) {
        const title = text(product.querySelector('.listaProdutoTitulo'));
        const description = text(product.querySelector('.threeDots'));
        const categoryId = product.closest('.cardapioCategoria')?.id || '';
        const imgEl = product.querySelector('.container_foto img, picture img');
        const imageSrc = imgEl ? (imgEl.currentSrc || imgEl.getAttribute('src') || imgEl.src || '') : '';
        const prices = [];
        product.querySelectorAll('.divCardProduto p, .divCardProduto span').forEach(function (node) {
            const value = text(node);
            if (value.includes('R$') && !node.classList.contains('listaProdutoTitulo') && !prices.includes(value)) {
                prices.push(value);
            }
        });
        const rule = getProductRule(categoryId, title);
        return { title, description, prices, categoryId, imageSrc, rule };
    }

    function createProductDetailUi() {
        if (document.getElementById('pagina-detalhe-produto')) return;

        const detail = document.createElement('section');
        detail.id = 'pagina-detalhe-produto';
        detail.className = 'pagina-detalhe-produto';
        detail.style.display = 'none';
        detail.innerHTML = `
            <header class="detalhe-produto-header">
                <button type="button" id="detalhe-voltar" class="detalhe-voltar" aria-label="Voltar">
                    <span aria-hidden="true">‹</span>
                </button>
                <div class="detalhe-header-textos">
                    <p>Montar pedido</p>
                    <h1 id="detalhe-header-titulo"></h1>
                </div>
            </header>
            <div class="detalhe-produto-conteudo">
                <div id="detalhe-imagem-wrap" class="detalhe-imagem-wrap">
                    <img id="detalhe-imagem" src="" alt="">
                </div>
                <div class="detalhe-produto-body">
                    <h2 id="detalhe-titulo"></h2>
                    <p id="detalhe-descricao"></p>
                    <div id="detalhe-precos" class="detalhe-precos"></div>
                    <div id="detalhe-mensagem" class="detalhe-mensagem" aria-live="polite"></div>
                    <div id="detalhe-controles" class="detalhe-controles"></div>
                </div>
            </div>
        `;
        document.getElementById('app').appendChild(detail);
        document.getElementById('detalhe-voltar').addEventListener('click', backToMenu);
    }

    function showProductDetail() {
        state.cardapioScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const detail = document.getElementById('pagina-detalhe-produto');
        const paginaCardapio = document.getElementById('pagina-cardapio');
        const paginaInicial = document.getElementById('pagina-inicial');
        if (!detail || !state.currentProduct) return;

        renderProductDetail();
        if (paginaInicial) paginaInicial.style.display = 'none';
        if (paginaCardapio) paginaCardapio.style.display = 'none';
        detail.style.display = 'block';
        document.body.classList.add('detalhe-produto-ativo');
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }

    function backToMenu() {
        const detail = document.getElementById('pagina-detalhe-produto');
        const paginaCardapio = document.getElementById('pagina-cardapio');
        if (detail) detail.style.display = 'none';
        if (paginaCardapio) paginaCardapio.style.display = 'block';
        document.body.classList.remove('detalhe-produto-ativo');
        requestAnimationFrame(function () {
            window.scrollTo(0, state.cardapioScrollY || 0);
        });
    }

    function renderProductDetail() {
        const product = state.currentProduct;
        setText('detalhe-header-titulo', product.title);
        setText('detalhe-titulo', product.title);
        setText('detalhe-descricao', product.description || '');
        setText('detalhe-mensagem', '');

        const image = document.getElementById('detalhe-imagem');
        const imageWrap = document.getElementById('detalhe-imagem-wrap');
        if (product.imageSrc) {
            image.src = product.imageSrc;
            image.alt = product.title;
            imageWrap.style.display = 'block';
        } else {
            image.src = '';
            image.alt = '';
            imageWrap.style.display = 'none';
        }

        const prices = document.getElementById('detalhe-precos');
        prices.innerHTML = '';
        product.prices.forEach(function (price) {
            const item = document.createElement('span');
            item.textContent = price;
            prices.appendChild(item);
        });

        renderDetailControls();
    }

    function renderDetailControls() {
        const product = state.currentProduct;
        const controls = document.getElementById('detalhe-controles');
        controls.innerHTML = '';

        if (!product.prices.length) {
            controls.innerHTML = '<p class="detalhe-info">Item informativo. Chame o atendimento para mais detalhes.</p>';
            return;
        }

        if (product.rule.orderable === false) {
            controls.innerHTML = `<div class="detalhe-indisponivel">${escapeHtml(product.rule.message || 'Item disponível apenas com atendimento.')}</div>`;
            return;
        }

        controls.innerHTML = `
            <div class="detalhe-form-grid">
                <label class="pedido-campo">
                    <span>Opção</span>
                    <select id="pedido-preco"></select>
                </label>
                <label class="pedido-campo">
                    <span>Quantidade</span>
                    <input id="pedido-quantidade" type="number" min="1" max="99" value="1">
                </label>
                <div id="pedido-opcionais" class="detalhe-opcionais"></div>
                <label class="pedido-campo pedido-campo-full">
                    <span>Observações</span>
                    <textarea id="pedido-observacao" rows="3" placeholder="Ex.: sem cebola, sem vinagrete"></textarea>
                </label>
            </div>
            <div class="detalhe-acao-wrap">
                <button type="button" class="pedido-adicionar detalhe-adicionar">Adicionar ao pedido</button>
            </div>
        `;

        const priceSelect = controls.querySelector('#pedido-preco');
        product.prices.forEach(function (price) {
            const option = document.createElement('option');
            option.value = price;
            option.textContent = price;
            priceSelect.appendChild(option);
        });

        renderRequiredOptions(controls);
        controls.querySelector('.detalhe-adicionar').addEventListener('click', addCurrentProductToCart);
    }

    function renderRequiredOptions(root) {
        const container = root.querySelector('#pedido-opcionais');
        const requiredOptions = state.currentProduct.rule.requiredOptions || [];
        if (!requiredOptions.length) {
            container.remove();
            return;
        }
        requiredOptions.forEach(function (optionRule, index) {
            const field = document.createElement('label');
            field.className = 'pedido-campo';
            field.innerHTML = `
                <span>${escapeHtml(optionRule.label)}</span>
                <select data-option-index="${index}" data-option-name="${escapeHtml(optionRule.name)}">
                    <option value="">Selecione</option>
                </select>
            `;
            const select = field.querySelector('select');
            optionRule.values.forEach(function (value) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                select.appendChild(option);
            });
            container.appendChild(field);
        });
    }

    function addCurrentProductToCart() {
        const controls = document.getElementById('detalhe-controles');
        const priceSelect = controls.querySelector('#pedido-preco');
        const quantityInput = controls.querySelector('#pedido-quantidade');
        const notesInput = controls.querySelector('#pedido-observacao');
        const quantity = Number(quantityInput.value);
        if (!Number.isInteger(quantity) || quantity < 1) {
            showDetailMessage('Informe uma quantidade válida.', true);
            return;
        }

        const selectedPrice = priceSelect.value;
        const options = collectOptions(controls, selectedPrice);
        if (options == null) {
            return;
        }

        state.items.push({
            name: state.currentProduct.title,
            variant: selectedPrice,
            quantity,
            unitPriceText: selectedPrice,
            options,
            notes: notesInput.value.trim()
        });
        updateCartUi();
        showCartMessage('Item adicionado ao pedido.');
        backToMenu();
    }

    function collectOptions(root, selectedPrice) {
        const options = [];
        const derivedOptions = state.currentProduct.rule.derivedOptions || [];
        derivedOptions.forEach(function (derive) {
            const value = derive.value(selectedPrice);
            if (value) {
                options.push({ name: derive.name, value });
            }
        });

        const selects = Array.from(root.querySelectorAll('#pedido-opcionais select'));
        for (const select of selects) {
            const value = select.value;
            const name = select.dataset.optionName;
            if (!value) {
                showDetailMessage(`Selecione: ${name}.`, true);
                return null;
            }
            options.push({ name, value });
        }
        return options;
    }

    function createCartUi() {
        if (document.querySelector('.pedido-carrinho')) return;

        const cart = document.createElement('aside');
        cart.className = 'pedido-carrinho';
        cart.innerHTML = `
            <button type="button" class="pedido-carrinho-toggle" aria-expanded="false">
                Pedido <span id="pedido-contador">0</span>
            </button>
            <div class="pedido-carrinho-painel" hidden>
                <div class="pedido-carrinho-header">
                    <h2>Meu pedido</h2>
                    <button type="button" class="pedido-carrinho-fechar" aria-label="Fechar">×</button>
                </div>
                <div id="pedido-mensagem" class="pedido-mensagem" aria-live="polite"></div>
                <div id="pedido-itens" class="pedido-itens"></div>
                <div class="pedido-total">
                    <span>Total</span>
                    <strong id="pedido-total">R$ 0,00</strong>
                </div>
                <label class="pedido-campo pedido-campo-full">
                    <span>Nome do cliente</span>
                    <input id="pedido-cliente" type="text" autocomplete="name" placeholder="Seu nome">
                </label>
                <label class="pedido-campo pedido-campo-full">
                    <span>Forma de pagamento</span>
                    <select id="pedido-pagamento"></select>
                </label>
                <button type="button" id="pedido-enviar" class="pedido-enviar">Enviar pedido</button>
            </div>
        `;

        const paymentSelect = cart.querySelector('#pedido-pagamento');
        paymentMethods.forEach(function (method) {
            const option = document.createElement('option');
            option.value = method;
            option.textContent = method;
            paymentSelect.appendChild(option);
        });

        cart.querySelector('.pedido-carrinho-toggle').addEventListener('click', toggleCart);
        cart.querySelector('.pedido-carrinho-fechar').addEventListener('click', closeCart);
        cart.querySelector('#pedido-enviar').addEventListener('click', submitOrder);
        document.body.appendChild(cart);
    }

    function toggleCart() {
        const panel = document.querySelector('.pedido-carrinho-painel');
        const button = document.querySelector('.pedido-carrinho-toggle');
        const shouldOpen = panel.hidden;
        panel.hidden = !shouldOpen;
        button.setAttribute('aria-expanded', String(shouldOpen));
    }

    function openCart() {
        const panel = document.querySelector('.pedido-carrinho-painel');
        const button = document.querySelector('.pedido-carrinho-toggle');
        panel.hidden = false;
        button.setAttribute('aria-expanded', 'true');
    }

    function closeCart() {
        const panel = document.querySelector('.pedido-carrinho-painel');
        const button = document.querySelector('.pedido-carrinho-toggle');
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
    }

    function updateCartUi() {
        const counter = document.querySelector('#pedido-contador');
        const items = document.querySelector('#pedido-itens');
        const total = document.querySelector('#pedido-total');
        if (!counter || !items || !total) return;

        const totalQuantity = state.items.reduce((sum, item) => sum + item.quantity, 0);
        counter.textContent = String(totalQuantity);
        total.textContent = formatCurrency(calculateTotal());

        if (!state.items.length) {
            items.innerHTML = '<p class="pedido-vazio">Seu pedido ainda está vazio.</p>';
            return;
        }

        items.innerHTML = '';
        state.items.forEach(function (item, index) {
            const row = document.createElement('div');
            row.className = 'pedido-item';
            row.innerHTML = `
                <div>
                    <strong>${escapeHtml(item.quantity + 'x ' + item.name)}</strong>
                    <span>${escapeHtml(item.unitPriceText)}</span>
                    ${formatOptions(item.options)}
                    ${item.notes ? `<small>${escapeHtml(item.notes)}</small>` : ''}
                </div>
                <button type="button" aria-label="Remover item">Remover</button>
            `;
            row.querySelector('button').addEventListener('click', function () {
                state.items.splice(index, 1);
                updateCartUi();
            });
            items.appendChild(row);
        });
    }

    async function submitOrder() {
        if (!state.items.length) {
            showCartMessage('Adicione pelo menos um item.', true);
            openCart();
            return;
        }

        const customerName = document.querySelector('#pedido-cliente').value.trim();
        const paymentMethod = document.querySelector('#pedido-pagamento').value;
        if (!customerName) {
            showCartMessage('Informe o nome do cliente.', true);
            openCart();
            return;
        }

        const button = document.querySelector('#pedido-enviar');
        button.disabled = true;
        button.textContent = 'Enviando...';

        try {
            const response = await fetch(ORDER_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName,
                    paymentMethod,
                    items: state.items,
                    totalText: formatCurrency(calculateTotal())
                })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body.ok === false) {
                throw new Error(body.error || 'Não foi possível enviar o pedido.');
            }
            state.items = [];
            updateCartUi();
            showCartMessage(`Pedido enviado: ${body.orderId || 'recebido'}.`);
        } catch (error) {
            showCartMessage(error.message || 'Falha ao enviar pedido.', true);
        } finally {
            button.disabled = false;
            button.textContent = 'Enviar pedido';
            openCart();
        }
    }

    function calculateTotal() {
        return state.items.reduce(function (sum, item) {
            return sum + parsePrice(item.unitPriceText) * item.quantity;
        }, 0);
    }

    function parsePrice(value) {
        const match = /R\$\s*([0-9.]+,[0-9]{2})/.exec(value || '');
        if (!match) return 0;
        return Number(match[1].replace(/\./g, '').replace(',', '.'));
    }

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function showCartMessage(message, error) {
        const element = document.querySelector('#pedido-mensagem');
        if (!element) return;
        element.textContent = message;
        element.classList.toggle('pedido-mensagem-erro', Boolean(error));
    }

    function showDetailMessage(message, error) {
        const element = document.getElementById('detalhe-mensagem');
        if (!element) return;
        element.textContent = message;
        element.classList.toggle('detalhe-mensagem-erro', Boolean(error));
    }

    function text(node) {
        return node ? node.textContent.trim() : '';
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value || '';
    }

    function getProductRule(categoryId, title) {
        if (nonOrderableTitles.has(title)) {
            return { orderable: false, message: 'Item informativo. Chame o atendimento para mais detalhes.' };
        }
        return productRules[`${categoryId}|${title}`] || productRules[title] || {};
    }

    function meatDoneness() {
        return {
            name: 'Ponto da carne',
            label: 'Ponto da carne',
            values: ['Mal passado', 'Ao ponto', 'Bem passado']
        };
    }

    function sideDish() {
        return {
            name: 'Acompanhamento',
            label: 'Acompanhamento',
            values: ['Batata frita', 'Mandioca frita']
        };
    }

    function sizeFromPrice() {
        return {
            name: 'Tamanho',
            value: function (price) {
                const normalized = (price || '').toUpperCase();
                if (normalized.includes('MEIA')) return 'MEIA';
                if (normalized.includes('INTEIRA')) return 'INTEIRA';
                return '';
            }
        };
    }

    function riceFromPrice() {
        return {
            name: 'Arroz',
            value: function (price) {
                const normalized = (price || '').toLowerCase();
                if (normalized.includes('sem arroz')) return 'Sem arroz';
                if (normalized.includes('arroz')) return 'Com arroz';
                return '';
            }
        };
    }

    function riceSizeFromPrice() {
        return {
            name: 'Tamanho',
            value: function (price) {
                const normalized = (price || '').toUpperCase();
                if (normalized.startsWith('P:')) return 'P';
                if (normalized.startsWith('G:')) return 'G';
                return '';
            }
        };
    }

    function formatOptions(options) {
        if (!Array.isArray(options) || !options.length) {
            return '';
        }
        return options
            .map(option => `<small>${escapeHtml(option.name)}: ${escapeHtml(option.value)}</small>`)
            .join('');
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[char];
        });
    }
})();
