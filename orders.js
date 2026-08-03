(function () {
    const API_BASE_URL = (window.BECO_ORDERS_API_BASE_URL || '').replace(/\/$/, '');
    const ORDER_ENDPOINT = `${API_BASE_URL}/orders`;
    const PAYMENT_POLL_INTERVAL_MS = 4000;
    const PIX_ONLY_MESSAGE = 'Pedidos online e direto da mesa são finalizados somente via Pix.';
    const productRules = {
        'entradinhas|Pastelzinhos do Beco': { orderable: false, message: 'Item disponível apenas com atendimento.' },
        'entradinhas|Torresmo': { orderable: false, message: 'Item disponível apenas com atendimento.' },
        'entradinhas|Queijo coalho com mel': { orderable: false, message: 'Item disponível apenas com atendimento.' },
        'entradinhas|Bolinhos da Casa Artesanal': { orderable: false, message: 'Item disponível apenas com atendimento.' },
        'testes-online|Trio Teste': {
            orderable: true,
            message: 'Item permanente para testes online do Pix. Sem validade.'
        },
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
        cardapioScrollY: 0,
        paymentPollId: null,
        lastPixOrder: null
    };

    document.addEventListener('DOMContentLoaded', function () {
        createProductDetailUi();
        createPixPaymentUi();
        createOrderSuccessUi();
        createCartUi();
        setupPixOnlyNotice();
        setupOrderableBadges();
        updateCartUi();
        setupScreenshotMode();
    });

    document.addEventListener('click', function (event) {
        const product = event.target.closest('.produtoContainer');
        if (!product || event.target.closest('.pedido-carrinho') || event.target.closest('.pagina-detalhe-produto') || event.target.closest('.pagina-pagamento-pix') || event.target.closest('.pagina-sucesso-pedido')) {
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
                    <div id="detalhe-tag-online" class="pedido-online-tag detalhe-tag-online" hidden>Pedido online</div>
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

    function createPixPaymentUi() {
        if (document.getElementById('pagina-pagamento-pix')) return;

        const payment = document.createElement('section');
        payment.id = 'pagina-pagamento-pix';
        payment.className = 'pagina-pagamento-pix';
        payment.style.display = 'none';
        payment.innerHTML = `
            <header class="pix-header">
                <button type="button" id="pix-voltar" class="detalhe-voltar" aria-label="Voltar">
                    <span aria-hidden="true">‹</span>
                </button>
                <div class="detalhe-header-textos">
                    <p>Pagamento</p>
                    <h1>Pix</h1>
                </div>
            </header>
            <div class="pix-conteudo">
                <div class="pix-status" id="pix-status">Aguardando pagamento</div>
                <h2>Finalize o Pix no app do banco</h2>
                <p>Use o QR Code ou copie o código Pix. O pedido será enviado para a cozinha automaticamente após a confirmação.</p>
                <div id="pix-resumo" class="pix-resumo"></div>
                <div id="pix-qrcode" class="pix-qrcode"></div>
                <label class="pix-codigo">
                    <span>Pix copia e cola</span>
                    <textarea id="pix-brcode" readonly></textarea>
                </label>
                <button type="button" id="pix-copiar" class="pix-copiar">Copiar código Pix</button>
                <p id="pix-expira" class="pix-expira"></p>
                <p id="pix-mensagem" class="pix-mensagem" aria-live="polite"></p>
            </div>
        `;
        document.getElementById('app').appendChild(payment);
        document.getElementById('pix-voltar').addEventListener('click', backToMenu);
        document.getElementById('pix-copiar').addEventListener('click', copyPixCode);
    }

    function createOrderSuccessUi() {
        if (document.getElementById('pagina-sucesso-pedido')) return;

        const success = document.createElement('section');
        success.id = 'pagina-sucesso-pedido';
        success.className = 'pagina-sucesso-pedido';
        success.style.display = 'none';
        success.innerHTML = `
            <div class="sucesso-conteudo">
                <div class="sucesso-icone" aria-hidden="true">✓</div>
                <p class="sucesso-status">Pagamento confirmado</p>
                <h2>Pedido enviado para a cozinha</h2>
                <p>Agora é só aguardar. A equipe já recebeu os detalhes do seu pedido.</p>
                <div class="sucesso-pedido">
                    <span>Senha do pedido</span>
                    <strong id="sucesso-order-password"></strong>
                    <small>Número do pedido: <b id="sucesso-order-id"></b></small>
                </div>
                <div class="sucesso-orientacao" id="sucesso-orientacao"></div>
                <button type="button" id="sucesso-salvar" class="sucesso-salvar">Salvar número do pedido</button>
                <button type="button" id="sucesso-voltar" class="sucesso-voltar">Voltar ao cardápio</button>
            </div>
        `;
        document.getElementById('app').appendChild(success);
        document.getElementById('sucesso-voltar').addEventListener('click', backToMenu);
        document.getElementById('sucesso-salvar').addEventListener('click', saveOrderNumber);
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
        stopPaymentPolling();
        const detail = document.getElementById('pagina-detalhe-produto');
        const payment = document.getElementById('pagina-pagamento-pix');
        const success = document.getElementById('pagina-sucesso-pedido');
        const paginaCardapio = document.getElementById('pagina-cardapio');
        if (detail) detail.style.display = 'none';
        if (payment) payment.style.display = 'none';
        if (success) success.style.display = 'none';
        if (paginaCardapio) paginaCardapio.style.display = 'block';
        document.body.classList.remove('detalhe-produto-ativo');
        document.body.classList.remove('pagamento-pix-ativo');
        document.body.classList.remove('sucesso-pedido-ativo');
        document.getElementById('pix-status')?.classList.remove('pix-status-shimmer');
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
        const detailTag = document.getElementById('detalhe-tag-online');
        if (detailTag) {
            detailTag.hidden = !isProductOrderable(product);
        }

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
                <div class="pedido-pix-aviso">${PIX_ONLY_MESSAGE}</div>
                <fieldset class="pedido-consumo">
                    <legend>Como deseja receber?</legend>
                    <label>
                        <input type="radio" name="pedido-consumo" value="LOCAL" checked>
                        <span>Comer no local</span>
                    </label>
                    <label>
                        <input type="radio" name="pedido-consumo" value="TAKEAWAY">
                        <span>Viagem</span>
                    </label>
                </fieldset>
                <label class="pedido-campo pedido-campo-full" id="pedido-campo-mesa">
                    <span>Mesa</span>
                    <input id="pedido-mesa" type="text" inputmode="numeric" autocomplete="off" placeholder="Ex.: 04">
                </label>
                <label class="pedido-campo pedido-campo-full">
                    <span id="pedido-cliente-label">Nome para retirada</span>
                    <input id="pedido-cliente" type="text" autocomplete="name" placeholder="Seu nome">
                </label>
                <div class="pedido-pagamento-fixo">
                    <span>Pagamento</span>
                    <strong>Pix</strong>
                </div>
                <button type="button" id="pedido-enviar" class="pedido-enviar">Enviar pedido</button>
            </div>
        `;

        cart.querySelector('.pedido-carrinho-toggle').addEventListener('click', toggleCart);
        cart.querySelector('.pedido-carrinho-fechar').addEventListener('click', closeCart);
        cart.querySelector('#pedido-enviar').addEventListener('click', submitOrder);
        cart.querySelectorAll('input[name="pedido-consumo"]').forEach(function (input) {
            input.addEventListener('change', updateConsumptionUi);
        });
        document.body.appendChild(cart);
        updateConsumptionUi();
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

    function updateConsumptionUi() {
        const consumptionType = getConsumptionType();
        const tableField = document.getElementById('pedido-campo-mesa');
        const customerLabel = document.getElementById('pedido-cliente-label');
        const customerInput = document.getElementById('pedido-cliente');
        if (tableField) {
            tableField.hidden = consumptionType !== 'LOCAL';
        }
        if (customerLabel) {
            customerLabel.textContent = consumptionType === 'LOCAL' ? 'Nome do cliente (opcional)' : 'Nome para retirada';
        }
        if (customerInput) {
            customerInput.placeholder = consumptionType === 'LOCAL' ? 'Opcional' : 'Seu nome';
        }
    }

    function getConsumptionType() {
        return document.querySelector('input[name="pedido-consumo"]:checked')?.value || 'LOCAL';
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

        const consumptionType = getConsumptionType();
        const tableNumber = document.querySelector('#pedido-mesa')?.value.trim() || '';
        const customerName = document.querySelector('#pedido-cliente').value.trim();
        const paymentMethod = 'Pix';
        if (consumptionType === 'LOCAL' && !tableNumber) {
            showCartMessage('Informe a mesa para comer no local.', true);
            openCart();
            return;
        }
        if (consumptionType === 'TAKEAWAY' && !customerName) {
            showCartMessage('Informe o nome para retirada.', true);
            openCart();
            return;
        }

        const button = document.querySelector('#pedido-enviar');
        button.disabled = true;
        button.textContent = 'Enviando...';
        const orderSnapshot = {
            items: state.items.map(item => ({ ...item, options: Array.isArray(item.options) ? [...item.options] : [] })),
            totalText: formatCurrency(calculateTotal()),
            consumptionType,
            tableNumber,
            customerName
        };

        try {
            const response = await fetch(ORDER_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName,
                    paymentMethod,
                    consumptionType,
                    tableNumber,
                    items: state.items,
                    totalText: orderSnapshot.totalText
                })
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok || body.ok === false) {
                throw new Error(body.error || 'Não foi possível enviar o pedido.');
            }
            Object.assign(body, orderSnapshot);
            state.items = [];
            updateCartUi();
            closeCart();
            if (body.status === 'PAYMENT_PENDING' && body.payment) {
                showPixPayment(body);
            } else {
                showCartMessage(`Pedido enviado: ${body.orderId || 'recebido'}.`);
                openCart();
            }
        } catch (error) {
            showCartMessage(error.message || 'Falha ao enviar pedido.', true);
            openCart();
        } finally {
            button.disabled = false;
            button.textContent = 'Enviar pedido';
        }
    }

    function showPixPayment(order) {
        const payment = document.getElementById('pagina-pagamento-pix');
        const paginaCardapio = document.getElementById('pagina-cardapio');
        const paginaInicial = document.getElementById('pagina-inicial');
        const pix = order.payment || {};
        if (!payment) return;

        state.lastPixOrder = order;
        if (paginaInicial) paginaInicial.style.display = 'none';
        if (paginaCardapio) paginaCardapio.style.display = 'none';
        payment.style.display = 'block';
        document.body.classList.add('pagamento-pix-ativo');
        document.body.classList.remove('detalhe-produto-ativo');
        setText('pix-status', 'Aguardando pagamento');
        document.getElementById('pix-status')?.classList.add('pix-status-shimmer');
        setText('pix-mensagem', `Pedido ${order.orderId}. Assim que o Pix for confirmado, a cozinha receberá seu pedido.`);
        setText('pix-expira', pix.expiresAt ? `Este Pix expira em ${formatDateTime(pix.expiresAt)}.` : '');
        renderPixSummary(order);

        const codeInput = document.getElementById('pix-brcode');
        if (codeInput) codeInput.value = pix.brCode || '';
        renderQrCode(pix.qrCodeImage);
        window.scrollTo(0, 0);
        startPaymentPolling(order.orderId);
    }

    function renderQrCode(value) {
        const wrap = document.getElementById('pix-qrcode');
        if (!wrap) return;
        wrap.innerHTML = '';
        if (!value) {
            wrap.innerHTML = '<p>Use o código Pix copia e cola abaixo.</p>';
            return;
        }
        const img = document.createElement('img');
        img.alt = 'QR Code Pix';
        img.src = value.startsWith('data:') || value.startsWith('http') ? value : `data:image/png;base64,${value}`;
        wrap.appendChild(img);
    }

    async function copyPixCode() {
        const codeInput = document.getElementById('pix-brcode');
        const code = codeInput ? codeInput.value : '';
        if (!code) {
            setText('pix-mensagem', 'Código Pix indisponível. Chame o atendimento.');
            return;
        }
        try {
            await navigator.clipboard.writeText(code);
            setText('pix-mensagem', 'Código Pix copiado.');
        } catch (error) {
            codeInput.focus();
            codeInput.select();
            setText('pix-mensagem', 'Selecione e copie o código Pix manualmente.');
        }
    }

    function startPaymentPolling(orderId) {
        stopPaymentPolling();
        checkPaymentStatus(orderId);
        state.paymentPollId = window.setInterval(function () {
            checkPaymentStatus(orderId);
        }, PAYMENT_POLL_INTERVAL_MS);
    }

    function stopPaymentPolling() {
        if (state.paymentPollId) {
            window.clearInterval(state.paymentPollId);
            state.paymentPollId = null;
        }
    }

    async function checkPaymentStatus(orderId) {
        try {
            const response = await fetch(`${ORDER_ENDPOINT}/${encodeURIComponent(orderId)}`);
            if (!response.ok) return;
            const order = await response.json();
            if (['PAID', 'PRINT_REQUESTED', 'PRINTED'].includes(order.status)) {
                stopPaymentPolling();
                showOrderSuccess(Object.assign({}, state.lastPixOrder || {}, order));
            } else if (order.status === 'PAYMENT_EXPIRED') {
                stopPaymentPolling();
                setText('pix-status', 'Pix expirado');
                document.getElementById('pix-status')?.classList.remove('pix-status-shimmer');
                setText('pix-mensagem', 'Este Pix expirou. Refaca o pedido ou chame o atendimento.');
            }
        } catch (error) {
            setText('pix-mensagem', 'Aguardando confirmação do pagamento...');
        }
    }

    function showOrderSuccess(order) {
        const success = document.getElementById('pagina-sucesso-pedido');
        const payment = document.getElementById('pagina-pagamento-pix');
        const detail = document.getElementById('pagina-detalhe-produto');
        const paginaCardapio = document.getElementById('pagina-cardapio');
        if (!success) return;
        const orderData = typeof order === 'string'
            ? Object.assign({}, state.lastPixOrder || {}, { orderId: order })
            : Object.assign({}, state.lastPixOrder || {}, order || {});

        if (payment) payment.style.display = 'none';
        if (detail) detail.style.display = 'none';
        if (paginaCardapio) paginaCardapio.style.display = 'none';
        setText('sucesso-order-id', orderData.orderId || '');
        setText('sucesso-order-password', orderPassword(orderData.orderId));
        renderSuccessGuidance(orderData);
        document.getElementById('pix-status')?.classList.remove('pix-status-shimmer');
        success.style.display = 'block';
        document.body.classList.remove('pagamento-pix-ativo');
        document.body.classList.remove('detalhe-produto-ativo');
        document.body.classList.add('sucesso-pedido-ativo');
        window.scrollTo(0, 0);
    }

    function renderSuccessGuidance(order) {
        const element = document.getElementById('sucesso-orientacao');
        if (!element) return;
        const isTakeaway = order.consumptionType === 'TAKEAWAY';
        const password = orderPassword(order.orderId);
        const identity = isTakeaway
            ? (password ? ` pela senha ${escapeHtml(password)}` : ' pela senha do pedido')
            : (order.tableNumber ? ` na mesa ${escapeHtml(order.tableNumber)}` : ' na sua mesa');
        const mainMessage = isTakeaway
            ? `Enquanto seu pedido é preparado, ele será chamado${identity} assim que estiver pronto.`
            : `Enquanto seu pedido é preparado, nossa equipe irá se apresentar${identity} e preparar a sua mesa.`;
        element.innerHTML = `
            <strong>Enquanto aguarda</strong>
            <p>${mainMessage}</p>
            <p>Bom apetite! A qualquer momento você pode chamar nossos atendentes.</p>
        `;
    }

    async function saveOrderNumber() {
        const order = state.lastPixOrder || {};
        const orderId = order.orderId || text(document.getElementById('sucesso-order-id'));
        const password = orderPassword(orderId);
        const content = `Beco da Praia\nPedido: ${orderId}\nSenha: ${password}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'Pedido Beco da Praia', text: content });
                return;
            }
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(content);
                return;
            }
        } catch (error) {
            // Fall back to file download below.
        }
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pedido-${password || 'beco'}.txt`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    function setupPixOnlyNotice() {
        const page = document.getElementById('pagina-cardapio');
        const header = page?.querySelector('.header-cardapio, .header-beco');
        if (!page || !header || page.querySelector('.pix-only-notice')) return;
        const notice = document.createElement('div');
        notice.className = 'pix-only-notice';
        notice.innerHTML = `<strong>Pedido online somente via Pix</strong><span>${PIX_ONLY_MESSAGE}</span>`;
        header.insertAdjacentElement('afterend', notice);
    }

    function setupOrderableBadges() {
        document.querySelectorAll('.produtoContainer').forEach(function (productElement) {
            const product = readProduct(productElement);
            const title = productElement.querySelector('.listaProdutoTitulo');
            if (!title || productElement.querySelector('.pedido-online-tag')) return;
            if (!isProductOrderable(product)) return;
            const tag = document.createElement('span');
            tag.className = 'pedido-online-tag';
            tag.textContent = 'Pedido online';
            title.insertAdjacentElement('afterend', tag);
        });
    }

    function renderPixSummary(order) {
        const summary = document.getElementById('pix-resumo');
        if (!summary) return;
        const items = Array.isArray(order.items) ? order.items : [];
        const itemNames = items.length
            ? items.map(item => `${item.quantity || 1}x ${escapeHtml(item.name)}`).join('')
            : 'Itens do pedido';
        const location = order.consumptionType === 'LOCAL'
            ? `Mesa ${escapeHtml(order.tableNumber || '')}`
            : `Viagem${order.customerName ? ` - ${escapeHtml(order.customerName)}` : ''}`;
        const password = orderPassword(order.orderId);
        summary.innerHTML = `
            <div>
                <span>Valor do Pix</span>
                <strong>${escapeHtml(order.totalText || formatCurrency(calculateTotal()))}</strong>
            </div>
            <div class="pix-senha">
                <span>Senha do pedido</span>
                <strong>${escapeHtml(password)}</strong>
            </div>
            <p>${items.map(item => `<span>${escapeHtml(item.quantity || 1)}x ${escapeHtml(item.name)}</span>`).join('') || escapeHtml(itemNames)}</p>
            <small>${location}</small>
        `;
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

    function formatDateTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function orderPassword(orderId) {
        const digits = String(orderId || '').replace(/\D/g, '');
        return digits.length <= 3 ? digits : digits.slice(-3);
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

    function isProductOrderable(product) {
        return Boolean(product.prices.length) && product.rule.orderable !== false;
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

    function setupScreenshotMode() {
        const params = new URLSearchParams(window.location.search);
        const step = params.get('screenshot');
        if (!step) return;

        const paginaInicial = document.getElementById('pagina-inicial');
        const paginaCardapio = document.getElementById('pagina-cardapio');
        if (paginaInicial) paginaInicial.style.display = 'none';
        if (paginaCardapio) paginaCardapio.style.display = 'block';
        document.body.classList.add('screenshot-mode');

        if (step === 'cardapio') {
            window.scrollTo(0, 0);
            return;
        }
        if (step === 'detalhe') {
            openScreenshotProductDetail();
            return;
        }
        if (step === 'carrinho') {
            addScreenshotItem();
            openCart();
            return;
        }
        if (step === 'pix' || step === 'pix-copiado') {
            showPixPayment(screenshotOrder());
            stopPaymentPolling();
            if (step === 'pix-copiado') {
                setText('pix-mensagem', 'Código Pix copiado.');
            }
            return;
        }
        if (step === 'sucesso') {
            showOrderSuccess(screenshotOrder());
        }
    }

    function openScreenshotProductDetail() {
        const product = findProductByTitle('Mix de churrasco');
        if (!product) return;
        state.currentProduct = readProduct(product);
        showProductDetail();
        setSelectValue('pedido-preco', 'INTEIRA: R$ 95,00');
        setSelectValueByOptionName('Acompanhamento', 'Batata frita');
        setSelectValueByOptionName('Ponto da carne', 'Ao ponto');
        const notes = document.getElementById('pedido-observacao');
        if (notes) notes.value = 'Sem vinagrete';
    }

    function addScreenshotItem() {
        state.items = [{
            name: 'Mix de churrasco',
            variant: 'INTEIRA: R$ 95,00',
            quantity: 1,
            unitPriceText: 'INTEIRA: R$ 95,00',
            options: [
                { name: 'Tamanho', value: 'INTEIRA' },
                { name: 'Acompanhamento', value: 'Batata frita' },
                { name: 'Ponto da carne', value: 'Ao ponto' }
            ],
            notes: 'Sem vinagrete'
        }];
        updateCartUi();
        const customer = document.getElementById('pedido-cliente');
        const table = document.getElementById('pedido-mesa');
        const local = document.querySelector('input[name="pedido-consumo"][value="LOCAL"]');
        if (local) local.checked = true;
        if (table) table.value = '04';
        if (customer) customer.value = '';
        updateConsumptionUi();
    }

    function screenshotOrder() {
        return {
            orderId: 'B1752607100000-123',
            status: 'PAYMENT_PENDING',
            consumptionType: 'LOCAL',
            tableNumber: '04',
            customerName: '',
            totalText: 'R$ 95,00',
            items: [{
                name: 'Mix de churrasco',
                quantity: 1,
                unitPriceText: 'INTEIRA: R$ 95,00'
            }],
            payment: {
                brCode: '00020101021226870014br.gov.bcb.pix2565pix.openpix.com.br/qr/v2/demo-beco-da-praia520400005303986540595.005802BR5925BECO DA PRAIA RESTAURANTE6009FORTALEZA62070503***6304ABCD',
                qrCodeImage: screenshotQrCode(),
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            }
        };
    }

    function screenshotQrCode() {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">
              <rect width="260" height="260" fill="#fff"/>
              <rect x="18" y="18" width="58" height="58" fill="#111"/>
              <rect x="30" y="30" width="34" height="34" fill="#fff"/>
              <rect x="184" y="18" width="58" height="58" fill="#111"/>
              <rect x="196" y="30" width="34" height="34" fill="#fff"/>
              <rect x="18" y="184" width="58" height="58" fill="#111"/>
              <rect x="30" y="196" width="34" height="34" fill="#fff"/>
              <path d="M96 22h18v18H96zM132 22h14v14h-14zM98 58h42v14H98zM160 92h18v18h-18zM94 96h42v18H94zM142 120h58v18h-58zM96 150h18v18H96zM126 150h18v18h-18zM160 154h20v20h-20zM198 154h18v18h-18zM94 190h48v18H94zM154 194h18v18h-18zM190 196h42v18h-42zM96 224h18v18H96zM132 224h74v14h-74z" fill="#111"/>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    function findProductByTitle(title) {
        return Array.from(document.querySelectorAll('.produtoContainer')).find(function (product) {
            return text(product.querySelector('.listaProdutoTitulo')) === title;
        });
    }

    function scrollToMenuItem(title) {
        const product = findProductByTitle(title);
        if (product) {
            product.scrollIntoView({ block: 'center' });
        }
    }

    function setSelectValue(id, value) {
        const select = document.getElementById(id);
        if (select) select.value = value;
    }

    function setSelectValueByOptionName(name, value) {
        const select = Array.from(document.querySelectorAll('[data-option-name]')).find(function (element) {
            return element.dataset.optionName === name;
        });
        if (select) select.value = value;
    }
})();
