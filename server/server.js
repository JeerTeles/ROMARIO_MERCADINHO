/*const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Certifique-se de ter 'bcryptjs' instalado (npm install bcryptjs)

const app = express();
const PORT = 3000;
const DB_FILE = './server/database.sqlite';

// --- Função de Validação de Telefone Brasileiro (BACKEND) ---
// Retorna true se o telefone tiver 10 ou 11 dígitos (após remover caracteres não numéricos)
function isValidBrazilianPhone(phone) {
    if (!phone) return false;
    // Remove todos os caracteres não numéricos
    const cleanedPhone = String(phone).replace(/\D/g, ''); // Garante que é string e limpa
    // Verifica se tem 10 (DDD + 8 dígitos) ou 11 (DDD + 9 dígitos)
    // E verifica se não é uma string de zeros ou vazia após limpeza
    return (cleanedPhone.length === 10 || cleanedPhone.length === 11) && cleanedPhone !== '';
}

// Configurações do Express
app.use(express.json());
app.use(cors());

// Conecta ao banco de dados SQLite e inicializa tabelas
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');

        // --- Criação da Tabela 'clientes' com TODOS OS CAMPOS ---
        // Quando o database.sqlite é excluído, essa tabela será criada do zero
        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomeCliente TEXT NOT NULL,
            telefone TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            item TEXT DEFAULT "N/A",       -- NOVO CAMPO (ID do produto do estoque)
            quantidade INTEGER DEFAULT 0, -- NOVO CAMPO
            divida REAL DEFAULT 0.0       -- NOVO CAMPO
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "clientes":', err.message); } else { console.log('Tabela "clientes" criada ou já existe.'); }
        });

        // Tabela 'produtos_registrados' (existente)
        db.run(`CREATE TABLE IF NOT EXISTS produtos_registrados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            nome_item TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            valor_unitario REAL NOT NULL,
            valor_total REAL NOT NULL,
            data_registro TEXT NOT NULL,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "produtos_registrados":', err.message); } else { console.log('Tabela "produtos_registrados" criada ou já existe.'); }
        });

        // Tabela 'estoque' (existente)
        db.run(`CREATE TABLE IF NOT EXISTS estoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT NOT NULL UNIQUE,
            quantidade INTEGER NOT NULL,
            precoDeCompra REAL NOT NULL,
            precoDeVenda REAL NOT NULL
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "estoque":', err.message); } else { console.log('Tabela "estoque" criada ou já existe.'); }
        });

        // Tabela 'administrador' (existente, para verificação de senha)
        db.run(`CREATE TABLE IF NOT EXISTS administrador (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            senha_hash TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela "administrador":', err.message);
            } else {
                console.log('Tabela "administrador" criada ou já existe.');
                // Verifica se a tabela está vazia e insere a senha padrão
                db.get('SELECT COUNT(*) AS count FROM administrador', (err, row) => {
                    if (err) { console.error('Erro ao verificar administrador:', err.message); return; }
                    if (row.count === 0) {
                        const defaultPassword = '123456';
                        // Gerar um salt e hash da senha
                        bcrypt.hash(defaultPassword, 10, (err, hash) => { // 10 é o custo de salt (mais alto, mais seguro, mais lento)
                            if (err) { console.error('Erro ao gerar hash da senha:', err); return; }
                            db.run('INSERT INTO administrador (senha_hash) VALUES (?)', [hash], (err) => {
                                if (err) { console.error('Erro ao inserir senha padrão:', err.message); } else { console.log('Senha padrão (123456) inserida na tabela administrador.'); }
                            });
                        });
                    } else {
                        console.log('Tabela administrador já contém dados, não inserindo senha padrão.');
                    }
                });
            }
        });
    }
});

// --- Rotas da API para Clientes ---

// MODIFICADA: Obter todos os clientes com paginação (agora inclui o nome do produto)
app.get('/api/clientes', (req, res) => {
    const page = parseInt(req.query.page) || 1; // Página atual, padrão 1
    const limit = parseInt(req.query.limit) || 10; // Itens por página, padrão 10
    const offset = (page - 1) * limit; // Offset para a consulta SQL

    let totalClients = 0;

    // Primeiro, obtém a contagem total de clientes para calcular o total de páginas
    db.get('SELECT COUNT(*) AS count FROM clientes', [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        totalClients = row.count;

        // Em seguida, obtém os clientes para a página atual
        // Selecionando todos os campos, incluindo os novos: item, quantidade, divida
        // E adicionando LEFT JOIN com 'estoque' para obter o nome do produto
        const sql = `
            SELECT 
                c.id, c.nomeCliente, c.telefone, c.cpf, c.item, c.quantidade, c.divida,
                e.produto AS nomeProdutoItem
            FROM clientes c
            LEFT JOIN estoque e ON c.item = e.id
            LIMIT ? OFFSET ?
        `;
        db.all(sql, [limit, offset], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                data: rows,
                currentPage: page,
                perPage: limit,
                totalItems: totalClients,
                totalPages: Math.ceil(totalClients / limit)
            });
        });
    });
});

// MODIFICADA: Rota para buscar cliente por CPF (agora inclui o nome do produto)
app.get('/api/clientes/cpf/:cpf', (req, res) => {
    const cpf = req.params.cpf;
    const sql = `
        SELECT
            c.id, c.nomeCliente, c.telefone, c.cpf, c.item, c.quantidade, c.divida,
            e.produto AS nomeProdutoItem
        FROM clientes c
        LEFT JOIN estoque e ON c.item = e.id
        WHERE c.cpf = ?
    `;
    db.get(sql, [cpf], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!row) { res.status(404).json({ message: 'Cliente não encontrado com este CPF.' }); } else { res.json(row); }
    });
});

// MODIFICADA: Rota para buscar clientes por nome (agora inclui o nome do produto)
app.get('/api/clientes/nome/:nome', (req, res) => {
    const nome = req.params.nome;
    const sql = `
        SELECT
            c.id, c.nomeCliente, c.telefone, c.cpf, c.item, c.quantidade, c.divida,
            e.produto AS nomeProdutoItem
        FROM clientes c
        LEFT JOIN estoque e ON c.item = e.id
        WHERE c.nomeCliente LIKE ?
    `;
    db.all(sql, [`%${nome}%`], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (rows.length === 0) { res.status(404).json({ message: 'Nenhum cliente encontrado com este nome.' }); } else { res.json(rows); }
    });
});

// MODIFICADA: Adicionar um novo cliente (aceita e valida os novos campos)
app.post('/api/clientes', (req, res) => {
    let { nomeCliente, telefone, cpf, item, quantidade, divida } = req.body;

    telefone = String(telefone).replace(/\D/g, ''); // Garante que telefone seja string e limpa
    item = parseInt(item) || 0;       // Garante que seja inteiro, default 0 se inválido
    quantidade = parseInt(quantidade) || 0; // Garante que seja inteiro, default 0 se inválido
    divida = parseFloat(divida) || 0.0;     // Garante que seja float, default 0.0 se inválido

    // Validações básicas de campos obrigatórios
    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Os campos obrigatórios (Nome, Telefone, CPF) são necessários.' });
    }
    // Validação de formato de telefone
    if (!isValidBrazilianPhone(telefone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' });
    }
    // Validação de tipo para os novos campos
    if (isNaN(item) || isNaN(quantidade) || isNaN(divida) || quantidade < 0 || divida < 0) { // Validação de números positivos
        return res.status(400).json({ error: 'Item (ID), Quantidade devem ser números inteiros não negativos, e Dívida deve ser um número não negativo válido.' });
    }

    db.run(`INSERT INTO clientes (nomeCliente, telefone, cpf, item, quantidade, divida) VALUES (?, ?, ?, ?, ?, ?)`,
        [nomeCliente, telefone, cpf, item, quantidade, divida],
        function (err) {
            if (err) {
                // Erro de CPF duplicado
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) { return res.status(409).json({ error: 'CPF já cadastrado. O CPF deve ser único.' }); }
                res.status(500).json({ error: err.message }); return;
            }
            res.status(201).json({ id: this.lastID, ...req.body }); // Retorna o ID do novo cliente
        }
    );
});

// MODIFICADA: Atualizar um cliente existente (aceita e valida os novos campos)
app.put('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    let { nomeCliente, telefone, cpf, item, quantidade, divida } = req.body;

    telefone = String(telefone).replace(/\D/g, '');
    item = parseInt(item) || 0;
    quantidade = parseInt(quantidade) || 0;
    divida = parseFloat(divida) || 0.0;

    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Os campos obrigatórios (Nome, Telefone, CPF) são necessários.' });
    }
    if (!isValidBrazilianPhone(telefone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' });
    }
    if (isNaN(item) || isNaN(quantidade) || isNaN(divida) || quantidade < 0 || divida < 0) {
        return res.status(400).json({ error: 'Item (ID), Quantidade devem ser números inteiros não negativos, e Dívida deve ser um número não negativo válido.' });
    }

    db.run(`UPDATE clientes SET nomeCliente = ?, telefone = ?, cpf = ?, item = ?, quantidade = ?, divida = ? WHERE id = ?`,
        [nomeCliente, telefone, cpf, item, quantidade, divida, id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) { return res.status(409).json({ error: 'CPF já cadastrado para outro cliente. O CPF deve ser único.' }); }
                res.status(500).json({ error: err.message }); return;
            }
            if (this.changes === 0) { res.status(404).json({ error: 'Cliente não encontrado.' }); } else { res.json({ message: 'Cliente atualizado com sucesso.' }); }
        }
    );
});

app.delete('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM clientes WHERE id = ?`, id, function (err) {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ error: 'Cliente não encontrado.' }); } else { res.json({ message: 'Cliente excluído com sucesso.' }); }
    });
});

// --- Rota API: Verificação de Senha do Administrador (existente) ---
app.post('/api/admin/verify-password', (req, res) => {
    const { password } = req.body;

    if (!password) { return res.status(400).json({ message: 'Senha é obrigatória.' }); }

    db.get('SELECT senha_hash FROM administrador LIMIT 1', (err, row) => {
        if (err) { console.error('Erro ao buscar hash da senha:', err.message); return res.status(500).json({ message: 'Erro interno do servidor.' }); }
        if (!row) { return res.status(500).json({ message: 'Nenhuma senha de administrador configurada.' }); }

        bcrypt.compare(password, row.senha_hash, (err, result) => {
            if (err) { console.error('Erro ao comparar senhas:', err); return res.status(500).json({ message: 'Erro na comparação de senha.' }); }
            if (result) { res.status(200).json({ message: 'Senha correta.' }); } else { res.status(401).json({ message: 'Senha incorreta.' }); }
        });
    });
});

// --- Rotas da API para Produtos Registrados (Vendas/Itens para Clientes) ---
app.post('/api/produtos-registrados', (req, res) => {
    const { cpfCliente, nome_item, quantidade, valor_unitario } = req.body;

    if (!cpfCliente || !nome_item || !quantidade || !valor_unitario) {
        return res.status(400).json({ error: 'Todos os campos (CPF do Cliente, Item, Quantidade, Valor Unitário) são obrigatórios.' });
    }

    if (quantidade <= 0 || valor_unitario <= 0) {
        return res.status(400).json({ error: 'Quantidade e Valor Unitário devem ser maiores que zero.' });
    }

    // Primeiro, encontra o ID do cliente pelo CPF
    db.get('SELECT id FROM clientes WHERE cpf = ?', [cpfCliente], (err, clientRow) => {
        if (err) {
            console.error("Erro ao buscar cliente por CPF em produtos-registrados:", err.message);
            res.status(500).json({ error: "Erro ao registrar produto: problema com a busca do cliente." });
            return;
        }
        if (!clientRow) {
            res.status(404).json({ error: 'Cliente com CPF não encontrado. Cadastre o cliente primeiro.' });
            return;
        }

        const cliente_id = clientRow.id;
        const valor_total = quantidade * valor_unitario;
        const data_registro = new Date().toISOString(); // Data e hora atual

        db.run(`INSERT INTO produtos_registrados (cliente_id, nome_item, quantidade, valor_unitario, valor_total, data_registro) VALUES (?, ?, ?, ?, ?, ?)`,
            [cliente_id, nome_item, quantidade, valor_unitario, valor_total, data_registro],
            function (err) {
                if (err) {
                    console.error("Erro ao inserir produto registrado:", err.message);
                    res.status(500).json({ error: "Erro ao inserir produto registrado." });
                    return;
                }
                res.status(201).json({ id: this.lastID, ...req.body, cliente_id, valor_total, data_registro });
            }
        );
    });
});

// GET: Obter todos os produtos registrados (opcional, mas útil para consulta futura)
app.get('/api/produtos-registrados', (req, res) => {
    // JOIN com a tabela clientes para trazer os dados do cliente também
    const sql = `
        SELECT
            pr.id,
            pr.nome_item,
            pr.quantidade,
            pr.valor_unitario,
            pr.valor_total,
            pr.data_registro,
            c.nomeCliente,
            c.telefone,
            c.cpf
        FROM produtos_registrados pr
        JOIN clientes c ON pr.cliente_id = c.id
        ORDER BY pr.data_registro DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar produtos registrados:", err.message);
            res.status(500).json({ error: "Erro ao buscar produtos registrados." });
            return;
        }
        res.json(rows);
    });
});


// --- Rotas da API para Estoque ---

// NOVA ROTA: Obter lista simples de produtos do estoque (id e produto) para selects
app.get('/api/estoque/list-for-select', (req, res) => {
    db.all('SELECT id, produto FROM estoque ORDER BY produto ASC', [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json(rows);
    });
});

app.get('/api/estoque', (req, res) => {
    db.all('SELECT * FROM estoque', [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json(rows);
    });
});

app.post('/api/estoque', (req, res) => {
    const { produto, quantidade, precoDeCompra, precoDeVenda } = req.body;

    if (!produto || quantidade === undefined || precoDeCompra === undefined || precoDeVenda === undefined) {
        return res.status(400).json({ error: 'Todos os campos (Produto, Quantidade, Preço de Compra, Preço de Venda) são obrigatórios.' });
    }
    if (quantidade < 0 || precoDeCompra < 0 || precoDeVenda < 0) {
        return res.status(400).json({ error: 'Valores de Quantidade, Preço de Compra e Preço de Venda não podem ser negativos.' });
    }

    db.run(`INSERT INTO estoque (produto, quantidade, precoDeCompra, precoDeVenda) VALUES (?, ?, ?, ?)`,
        [produto, quantidade, precoDeCompra, precoDeVenda],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: estoque.produto')) {
                    return res.status(409).json({ error: 'Produto com este nome já existe no estoque.' });
                }
                res.status(500).json({ error: err.message }); return;
            }
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

app.put('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    const { produto, quantidade, precoDeCompra, precoDeVenda } = req.body;

    if (!produto || quantidade === undefined || precoDeCompra === undefined || precoDeVenda === undefined) {
        return res.status(400).json({ error: 'Todos os campos (Produto, Quantidade, Preço de Compra, Preço de Venda) são obrigatórios.' });
    }
    if (quantidade < 0 || precoDeCompra < 0 || precoDeVenda < 0) {
        return res.status(400).json({ error: 'Valores de Quantidade, Preço de Compra e Preço de Venda não podem ser negativos.' });
    }

    db.run(`UPDATE estoque SET produto = ?, quantidade = ?, precoDeCompra = ?, precoDeVenda = ? WHERE id = ?`,
        [produto, quantidade, precoDeCompra, precoDeVenda, id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: estoque.produto')) {
                    return res.status(409).json({ error: 'Produto com este nome já existe no estoque.' });
                }
                res.status(500).json({ error: err.message }); return;
            }
            if (this.changes === 0) { res.status(404).json({ error: 'Item de estoque não encontrado.' }); } else { res.json({ message: 'Item de estoque atualizado com sucesso.' }); }
        }
    );
});

app.delete('/api/estoque/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM estoque WHERE id = ?`, id, function (err) {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ error: 'Item de estoque não encontrado.' }); } else { res.json({ message: 'Item de estoque excluído com sucesso.' }); }
    });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
}); */



const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Certifique-se de ter 'bcryptjs' instalado (npm install bcryptjs)

const app = express();
const PORT = 3000;
const DB_FILE = './server/database.sqlite';

// --- Função de Validação de Telefone Brasileiro (BACKEND) ---
// Retorna true se o telefone tiver 10 ou 11 dígitos (após remover caracteres não numéricos)
function isValidBrazilianPhone(phone) {
    if (!phone) return false;
    // Remove todos os caracteres não numéricos
    const cleanedPhone = String(phone).replace(/\D/g, ''); // Garante que é string e limpa
    // Verifica se tem 10 (DDD + 8 dígitos) ou 11 (DDD + 9 dígitos)
    // E verifica se não é uma string de zeros ou vazia após limpeza
    return (cleanedPhone.length === 10 || cleanedPhone.length === 11) && cleanedPhone !== '';
}

// Configurações do Express
app.use(express.json());
app.use(cors());

// Conecta ao banco de dados SQLite e inicializa tabelas
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');

        // --- Criação da Tabela 'clientes' com 'item' como TEXT ---
        // Ao excluir database.sqlite, esta lógica a criará do zero com a nova estrutura.
        // A lógica de migração de tipo foi removida pois você estará sempre excluindo o DB.
        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomeCliente TEXT NOT NULL,
            telefone TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            item TEXT DEFAULT '',       -- AGORA É TEXT
            quantidade INTEGER DEFAULT 0,
            divida REAL DEFAULT 0.0
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "clientes":', err.message); } else { console.log('Tabela "clientes" criada ou já existe.'); }
        });

        // Tabela 'produtos_registrados' (existente)
        db.run(`CREATE TABLE IF NOT EXISTS produtos_registrados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            nome_item TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            valor_unitario REAL NOT NULL,
            valor_total REAL NOT NULL,
            data_registro TEXT NOT NULL,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "produtos_registrados":', err.message); } else { console.log('Tabela "produtos_registrados" criada ou já existe.'); }
        });

        // Tabela 'estoque' (existente)
        db.run(`CREATE TABLE IF NOT EXISTS estoque (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto TEXT NOT NULL UNIQUE,
            quantidade INTEGER NOT NULL,
            precoDeCompra REAL NOT NULL,
            precoDeVenda REAL NOT NULL
        )`, (err) => {
            if (err) { console.error('Erro ao criar tabela "estoque":', err.message); } else { console.log('Tabela "estoque" criada ou já existe.'); }
        });

        // Tabela 'administrador' (existente, para verificação de senha)
        db.run(`CREATE TABLE IF NOT EXISTS administrador (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            senha_hash TEXT NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela "administrador":', err.message);
            } else {
                console.log('Tabela "administrador" criada ou já existe.');
                // Verifica se a tabela está vazia e insere a senha padrão
                db.get('SELECT COUNT(*) AS count FROM administrador', (err, row) => {
                    if (err) { console.error('Erro ao verificar administrador:', err.message); return; }
                    if (row.count === 0) {
                        const defaultPassword = '123456';
                        // Gerar um salt e hash da senha
                        bcrypt.hash(defaultPassword, 10, (err, hash) => { // 10 é o custo de salt (mais alto, mais seguro, mais lento)
                            if (err) { console.error('Erro ao gerar hash da senha:', err); return; }
                            db.run('INSERT INTO administrador (senha_hash) VALUES (?)', [hash], (err) => {
                                if (err) { console.error('Erro ao inserir senha padrão:', err.message); } else { console.log('Senha padrão (123456) inserida na tabela administrador.'); }
                            });
                        });
                    } else {
                        console.log('Tabela administrador já contém dados, não inserindo senha padrão.');
                    }
                });
            }
        });
    }
});

// --- Rotas da API para Clientes ---

// MODIFICADA: Obter todos os clientes com paginação (seleciona 'item' como texto)
app.get('/api/clientes', (req, res) => {
    const page = parseInt(req.query.page) || 1; // Página atual, padrão 1
    const limit = parseInt(req.query.limit) || 10; // Itens por página, padrão 10
    const offset = (page - 1) * limit; // Offset para a consulta SQL

    let totalClients = 0;

    // Primeiro, obtém a contagem total de clientes para calcular o total de páginas
    db.get('SELECT COUNT(*) AS count FROM clientes', [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        totalClients = row.count;

        // Em seguida, obtém os clientes para a página atual
        // Selecionando 'item' que AGORA é TEXT
        const sql = `
            SELECT 
                id, nomeCliente, telefone, cpf, item, quantidade, divida
            FROM clientes
            LIMIT ? OFFSET ?
        `;
        db.all(sql, [limit, offset], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                data: rows,
                currentPage: page,
                perPage: limit,
                totalItems: totalClients,
                totalPages: Math.ceil(totalClients / limit)
            });
        });
    });
});

// MODIFICADA: Rota para buscar cliente por CPF (seleciona 'item' como texto)
app.get('/api/clientes/cpf/:cpf', (req, res) => {
    const cpf = req.params.cpf;
    const sql = `
        SELECT
            id, nomeCliente, telefone, cpf, item, quantidade, divida
        FROM clientes
        WHERE cpf = ?
    `;
    db.get(sql, [cpf], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!row) { res.status(404).json({ message: 'Cliente não encontrado com este CPF.' }); } else { res.json(row); }
    });
});

// MODIFICADA: Rota para buscar clientes por nome (seleciona 'item' como texto)
app.get('/api/clientes/nome/:nome', (req, res) => {
    const nome = req.params.nome;
    const sql = `
        SELECT
            id, nomeCliente, telefone, cpf, item, quantidade, divida
        FROM clientes
        WHERE nomeCliente LIKE ?
    `;
    db.all(sql, [`%${nome}%`], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (rows.length === 0) { res.status(404).json({ message: 'Nenhum cliente encontrado com este nome.' }); } else { res.json(rows); }
    });
});

// MODIFICADA: Adicionar um novo cliente (salva o nome do item diretamente)
app.post('/api/clientes', (req, res) => {
    let { nomeCliente, telefone, cpf, item, quantidade, divida } = req.body;

    telefone = String(telefone).replace(/\D/g, '');
    item = String(item).trim(); // item é uma string (nome do produto)
    quantidade = parseInt(quantidade) || 0;
    divida = parseFloat(divida) || 0.0;

    // Validações básicas de campos obrigatórios
    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Os campos obrigatórios (Nome, Telefone, CPF) são necessários.' });
    }
    // Validação de formato de telefone
    if (!isValidBrazilianPhone(telefone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' });
    }
    // Validação de tipo para os novos campos
    if (isNaN(quantidade) || quantidade < 0 || isNaN(divida) || divida < 0) {
        return res.status(400).json({ error: 'Quantidade devem ser números inteiros não negativos, e Dívida deve ser um número não negativo válido.' });
    }

    db.run(`INSERT INTO clientes (nomeCliente, telefone, cpf, item, quantidade, divida) VALUES (?, ?, ?, ?, ?, ?)`,
        [nomeCliente, telefone, cpf, item, quantidade, divida],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) { return res.status(409).json({ error: 'CPF já cadastrado. O CPF deve ser único.' }); }
                res.status(500).json({ error: err.message }); return;
            }
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

// MODIFICADA: Atualizar um cliente existente (salva o nome do item diretamente)
app.put('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    let { nomeCliente, telefone, cpf, item, quantidade, divida } = req.body;

    telefone = String(telefone).replace(/\D/g, '');
    item = String(item).trim(); // item é uma string (nome do produto)
    quantidade = parseInt(quantidade) || 0;
    divida = parseFloat(divida) || 0.0;

    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Os campos obrigatórios (Nome, Telefone, CPF) são necessários.' });
    }
    if (!isValidBrazilianPhone(telefone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' });
    }
    if (isNaN(quantidade) || quantidade < 0 || isNaN(divida) || divida < 0) {
        return res.status(400).json({ error: 'Quantidade devem ser números inteiros não negativos, e Dívida deve ser um número não negativo válido.' });
    }

    db.run(`UPDATE clientes SET nomeCliente = ?, telefone = ?, cpf = ?, item = ?, quantidade = ?, divida = ? WHERE id = ?`,
        [nomeCliente, telefone, cpf, item, quantidade, divida, id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) { return res.status(409).json({ error: 'CPF já cadastrado para outro cliente. O CPF deve ser único.' }); }
                res.status(500).json({ error: err.message }); return;
            }
            if (this.changes === 0) { res.status(404).json({ error: 'Cliente não encontrado.' }); } else { res.json({ message: 'Cliente atualizado com sucesso.' }); }
        }
    );
});

app.delete('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM clientes WHERE id = ?`, id, function (err) {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ error: 'Cliente não encontrado.' }); } else { res.json({ message: 'Cliente excluído com sucesso.' }); }
    });
});

// --- Rota API: Verificação de Senha do Administrador (existente) ---
app.post('/api/admin/verify-password', (req, res) => {
    const { password } = req.body;

    if (!password) { return res.status(400).json({ message: 'Senha é obrigatória.' }); }

    db.get('SELECT senha_hash FROM administrador LIMIT 1', (err, row) => {
        if (err) { console.error('Erro ao buscar hash da senha:', err.message); return res.status(500).json({ message: 'Erro interno do servidor.' }); }
        if (!row) { return res.status(500).json({ message: 'Nenhuma senha de administrador configurada.' }); }

        bcrypt.compare(password, row.senha_hash, (err, result) => {
            if (err) { console.error('Erro ao comparar senhas:', err); return res.status(500).json({ message: 'Erro na comparação de senha.' }); }
            if (result) { res.status(200).json({ message: 'Senha correta.' }); } else { res.status(401).json({ message: 'Senha incorreta.' }); }
        });
    });
});

// --- Rotas da API para Produtos Registrados (Vendas/Itens para Clientes) ---
app.post('/api/produtos-registrados', (req, res) => {
    const { cpfCliente, nome_item, quantidade, valor_unitario } = req.body;

    if (!cpfCliente || !nome_item || !quantidade || !valor_unitario) {
        return res.status(400).json({ error: 'Todos os campos (CPF do Cliente, Item, Quantidade, Valor Unitário) são obrigatórios.' });
    }

    if (quantidade <= 0 || valor_unitario <= 0) {
        return res.status(400).json({ error: 'Quantidade e Valor Unitário devem ser maiores que zero.' });
    }

    // Primeiro, encontra o ID do cliente pelo CPF
    db.get('SELECT id FROM clientes WHERE cpf = ?', [cpfCliente], (err, clientRow) => {
        if (err) {
            console.error("Erro ao buscar cliente por CPF em produtos-registrados:", err.message);
            res.status(500).json({ error: "Erro ao registrar produto: problema com a busca do cliente." });
            return;
        }
        if (!clientRow) {
            res.status(404).json({ error: 'Cliente com CPF não encontrado. Cadastre o cliente primeiro.' });
            return;
        }

        const cliente_id = clientRow.id;
        const valor_total = quantidade * valor_unitario;
        const data_registro = new Date().toISOString(); // Data e hora atual

        db.run(`INSERT INTO produtos_registrados (cliente_id, nome_item, quantidade, valor_unitario, valor_total, data_registro) VALUES (?, ?, ?, ?, ?, ?)`,
            [cliente_id, nome_item, quantidade, valor_unitario, valor_total, data_registro],
            function (err) {
                if (err) {
                    console.error("Erro ao inserir produto registrado:", err.message);
                    res.status(500).json({ error: "Erro ao inserir produto registrado." });
                    return;
                }
                res.status(201).json({ id: this.lastID, ...req.body, cliente_id, valor_total, data_registro });
            }
        );
    });
});

// GET: Obter todos os produtos registrados (opcional, mas útil para consulta futura)
app.get('/api/produtos-registrados', (req, res) => {
    // JOIN com a tabela clientes para trazer os dados do cliente também
    const sql = `
        SELECT
            pr.id,
            pr.nome_item,
            pr.quantidade,
            pr.valor_unitario,
            pr.valor_total,
            pr.data_registro,
            c.nomeCliente,
            c.telefone,
            c.cpf
        FROM produtos_registrados pr
        JOIN clientes c ON pr.cliente_id = c.id
        ORDER BY pr.data_registro DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Erro ao buscar produtos registrados:", err.message);
            res.status(500).json({ error: "Erro ao buscar produtos registrados." });
            return;
        }
        res.json(rows);
    });
});


// --- Rotas da API para Estoque ---

// MODIFICADA: Obter lista simples de produtos do estoque (id e produto) para selects
// Esta rota continuará retornando ID e Produto para o SELECT do frontend.
app.get('/api/estoque/list-for-select', (req, res) => {
    db.all('SELECT id, produto FROM estoque ORDER BY produto ASC', [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json(rows);
    });
});

app.get('/api/estoque', (req, res) => {
    db.all('SELECT * FROM estoque', [], (err, rows) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        res.json(rows);
    });
});

app.post('/api/estoque', (req, res) => {
    const { produto, quantidade, precoDeCompra, precoDeVenda } = req.body;

    if (!produto || quantidade === undefined || precoDeCompra === undefined || precoDeVenda === undefined) {
        return res.status(400).json({ error: 'Todos os campos (Produto, Quantidade, Preço de Compra, Preço de Venda) são obrigatórios.' });
    }
    if (quantidade < 0 || precoDeCompra < 0 || precoDeVenda < 0) {
        return res.status(400).json({ error: 'Valores de Quantidade, Preço de Compra e Preço de Venda não podem ser negativos.' });
    }

    db.run(`INSERT INTO estoque (produto, quantidade, precoDeCompra, precoDeVenda) VALUES (?, ?, ?, ?)`,
        [produto, quantidade, precoDeCompra, precoDeVenda],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: estoque.produto')) {
                    return res.status(409).json({ error: 'Produto com este nome já existe no estoque.' });
                }
                res.status(201).json({ id: this.lastID, ...req.body });
            }
        }
    );
});

app.put('/api/estoque/:id', (req, res) => {
    const { id } = req.params;
    const { produto, quantidade, precoDeCompra, precoDeVenda } = req.body;

    if (!produto || quantidade === undefined || precoDeCompra === undefined || precoDeVenda === undefined) {
        return res.status(400).json({ error: 'Todos os campos (Produto, Quantidade, Preço de Compra, Preço de Venda) são obrigatórios.' });
    }
    if (quantidade < 0 || precoDeCompra < 0 || precoDeVenda < 0) {
        return res.status(400).json({ error: 'Valores de Quantidade, Preço de Compra e Preço de Venda não podem ser negativos.' });
    }

    db.run(`UPDATE estoque SET produto = ?, quantidade = ?, precoDeCompra = ?, precoDeVenda = ? WHERE id = ?`,
        [produto, quantidade, precoDeCompra, precoDeVenda, id],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: estoque.produto')) {
                    return res.status(409).json({ error: 'Produto com este nome já existe no estoque.' });
                }
                res.status(500).json({ error: err.message }); return;
            }
            if (this.changes === 0) { res.status(404).json({ error: 'Item de estoque não encontrado.' }); } else { res.json({ message: 'Item de estoque atualizado com sucesso.' }); }
        }
    );
});

app.delete('/api/estoque/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM estoque WHERE id = ?`, id, function (err) {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ error: 'Item de estoque não encontrado.' }); } else { res.json({ message: 'Item de estoque excluído com sucesso.' }); }
    });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});