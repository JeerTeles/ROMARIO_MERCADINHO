const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

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

// Conecta ao banco de dados SQLite
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        // Cria a tabela 'clientes' se ela não existir
        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomeCliente TEXT NOT NULL,
            telefone TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            item INTEGER DEFAULT 0,       -- NOVO CAMPO
            quantidade INTEGER DEFAULT 0, -- NOVO CAMPO
            divida REAL DEFAULT 0.0       -- NOVO CAMPO
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela "clientes":', err.message);
            } else {
                console.log('Tabela "clientes" criada ou já existe.');
            }
        });

        // NOVA TABELA: 'produtos_registrados'
        // Armazena os itens que foram 'adicionados' para um cliente
        db.run(`CREATE TABLE IF NOT EXISTS produtos_registrados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER NOT NULL,
            nome_item TEXT NOT NULL,
            quantidade INTEGER NOT NULL,
            valor_unitario REAL NOT NULL,
            valor_total REAL NOT NULL,
            data_registro TEXT NOT NULL, -- Para registrar quando o item foi adicionado
            FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela "produtos_registrados":', err.message);
            } else {
                console.log('Tabela "produtos_registrados" criada ou já existe.');
            }
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
    }
});



// MODIFICADA: Obter todos os clientes com paginação
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
        db.all('SELECT * FROM clientes LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                data: rows, // <<-- ESTE É O OBJETO QUE O FRONTEND ESPERA!
                currentPage: page,
                perPage: limit,
                totalItems: totalClients,
                totalPages: Math.ceil(totalClients / limit)
            });
        });
    });
});

app.get('/api/clientes/cpf/:cpf', (req, res) => {
    const cpf = req.params.cpf;
    db.get('SELECT * FROM clientes WHERE cpf = ?', [cpf], (err, row) => {
        if (err) { res.status(500).json({ error: err.message }); return; }
        if (!row) { res.status(404).json({ message: 'Cliente não encontrado com este CPF.' }); } else { res.json(row); }
    });
});

// NOVA ROTA: Obter clientes por nome
app.get('/api/clientes/nome/:nome', (req, res) => {
    const nome = req.params.nome;
    // Usamos LIKE para buscar nomes que contenham a string informada
    // % é um curinga que representa zero ou mais caracteres
    db.all('SELECT * FROM clientes WHERE nomeCliente LIKE ?', [`%${nome}%`], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (rows.length === 0) {
            res.status(404).json({ message: 'Nenhum cliente encontrado com este nome.' });
        } else {
            res.json(rows);
        }
    });
});

// MODIFICADA: Adicionar um novo cliente
app.post('/api/clientes', (req, res) => {
    let { nomeCliente, telefone, cpf } = req.body;

    // Limpa o telefone antes da validação e armazenamento
    telefone = String(telefone).replace(/\D/g, ''); 

    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Todos os campos (Nome, Telefone, CPF) são obrigatórios.' });
    }
    // --- Nova Validação de Telefone ---
    if (!isValidBrazilianPhone(telefone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' });
    }

    db.run(`INSERT INTO clientes (nomeCliente, telefone, cpf) VALUES (?, ?, ?)`,
        [nomeCliente, telefone, cpf],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) { return res.status(409).json({ error: 'CPF já cadastrado. O CPF deve ser único.' }); }
                res.status(500).json({ error: err.message }); return;
            }
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

// MODIFICADA: Atualizar um cliente existente
app.put('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    let { nomeCliente, telefone, cpf } = req.body;

    // Limpa o telefone antes da validação e armazenamento
    telefone = String(telefone).replace(/\D/g, '');

    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Todos os campos (Nome, Telefone, CPF) são obrigatórios.' });
    }
    // --- Nova Validação de Telefone ---
    if (!isValidBrazilianPhone(telefone)) {
        return res.status(400).json({ error: 'Formato de telefone inválido. Use DDD + 8 ou 9 dígitos (somente números).' });
    }

    db.run(`UPDATE clientes SET nomeCliente = ?, telefone = ?, cpf = ? WHERE id = ?`,
        [nomeCliente, telefone, cpf, id],
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

// --- Rota API para Produtos Registrados (Vendas/Itens para Clientes) ---
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
            res.status(500).json({ error: err.message });
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
                    res.status(500).json({ error: err.message });
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
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});


// --- Rotas da API para Estoque ---
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
}); 