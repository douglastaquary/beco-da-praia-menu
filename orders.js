(function () {
    const API_BASE_URL = (window.BECO_ORDERS_API_BASE_URL || '').replace(/\/$/, '');
    const ORDER_ENDPOINT = `${API_BASE_URL}/orders`;
    const paymentMethods = ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'];
    const state = {
        currentProduct: null,
        items: []
    };

    document.addEventListener('DOMContentLoaded', function () {
        createCartUi();
        updateCartUi();
    });

    document.addEventListener('click', function (event) {
        const product = event.target.closest('.produtoContainer');
        if (!product || event.target.closest('.pedido-modal-controles') || event.target.closest('.pedido-carrinho')) {
            return;
        }
        state.currentProduct = readProduct(product);
        setTimeout(renderModalOrderControls, 0);
    }, true);

    function readProduct(product) {
        const title = text(product.querySelector('.listaProdutoTitulo'));
        const description = text(product.querySelector('.threeDots'));
        const prices = [];
        product.querySelectorAll('.divCardProduto p, .divCardProduto span').forEach(function (node) {
            const value = text(node);
            if (value.includes('R$') && !node.classList.contains('listaProdutoTitulo') && !prices.includes(value)) {
                prices.push(value);
            }
        });
        return { title, description, prices };
    }

    function renderModalOrderControls() {
        const body = document.querySelector('#modalPrato .modal-prato-body');
        if (!body || !state.currentProduct) return;
        body.querySelector('.pedido-modal-controles')?.remove();

        if (!state.currentProduct.prices.length) {
            return;
        }

        const controls = document.createElement('div');
        controls.className = 'pedido-modal-controles';
        controls.innerHTML = `
            <label class="pedido-campo">
                <span>Opção</span>
                <select id="pedido-preco"></select>
            </label>
            <label class="pedido-campo">
                <span>Quantidade</span>
                <input id="pedido-quantidade" type="number" min="1" max="99" value="1">
            </label>
            <label class="pedido-campo pedido-campo-full">
                <span>Observações</span>
                <textarea id="pedido-observacao" rows="2" placeholder="Ex.: sem cebola, ponto da carne"></textarea>
            </label>
            <button type="button" class="pedido-adicionar">Adicionar ao pedido</button>
        `;

        const priceSelect = controls.querySelector('#pedido-preco');
        state.currentProduct.prices.forEach(function (price) {
            const option = document.createElement('option');
            option.value = price;
            option.textContent = price;
            priceSelect.appendChild(option);
        });

        controls.querySelector('.pedido-adicionar').addEventListener('click', function () {
            const quantity = Number(controls.querySelector('#pedido-quantidade').value);
            if (!Number.isInteger(quantity) || quantity < 1) {
                showCartMessage('Informe uma quantidade válida.', true);
                return;
            }
            const selectedPrice = priceSelect.value;
            state.items.push({
                name: state.currentProduct.title,
                variant: selectedPrice,
                quantity,
                unitPriceText: selectedPrice,
                notes: controls.querySelector('#pedido-observacao').value.trim()
            });
            updateCartUi();
            showCartMessage('Item adicionado ao pedido.');
            if (typeof fecharModalPrato === 'function') {
                fecharModalPrato();
            }
        });

        body.appendChild(controls);
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

    function text(node) {
        return node ? node.textContent.trim() : '';
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
