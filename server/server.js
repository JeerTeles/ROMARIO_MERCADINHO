const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;
const DB_FILE = './server/database.sqlite';

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
        // CPF será UNIQUE para garantir que não haja duplicatas
        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nomeCliente TEXT NOT NULL,
            telefone TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela "clientes":', err.message);
            } else {
                console.log('Tabela "clientes" criada ou já existe.');
            }
        });
    }
});

// --- Rotas da API para Clientes ---

// GET: Obter todos os clientes
app.get('/api/clientes', (req, res) => {
    db.all('SELECT * FROM clientes', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// GET: Obter um cliente por CPF (para pesquisa)
app.get('/api/clientes/cpf/:cpf', (req, res) => {
    const cpf = req.params.cpf;
    db.get('SELECT * FROM clientes WHERE cpf = ?', [cpf], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ message: 'Cliente não encontrado com este CPF.' });
        } else {
            res.json(row);
        }
    });
});

// POST: Adicionar um novo cliente
app.post('/api/clientes', (req, res) => {
    const { nomeCliente, telefone, cpf } = req.body;

    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Todos os campos (Nome, Telefone, CPF) são obrigatórios.' });
    }

    db.run(`INSERT INTO clientes (nomeCliente, telefone, cpf) VALUES (?, ?, ?)`,
        [nomeCliente, telefone, cpf],
        function (err) {
            if (err) {
                // Erro de UNIQUE constraint para o CPF
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) {
                    return res.status(409).json({ error: 'CPF já cadastrado. O CPF deve ser único.' });
                }
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID, ...req.body });
        }
    );
});

// PUT: Atualizar um cliente existente
app.put('/api/clientes/:id', (req, res) => {
    const { id } = req.params;
    const { nomeCliente, telefone, cpf } = req.body;

    if (!nomeCliente || !telefone || !cpf) {
        return res.status(400).json({ error: 'Todos os campos (Nome, Telefone, CPF) são obrigatórios.' });
    }

    db.run(`UPDATE clientes SET nomeCliente = ?, telefone = ?, cpf = ? WHERE id = ?`,
        [nomeCliente, telefone, cpf, id],
        function (err) {
            if (err) {
                 // Erro de UNIQUE constraint para o CPF ao atualizar
                if (err.message.includes('UNIQUE constraint failed: clientes.cpf')) {
                    return res.status(409).json({ error: 'CPF já cadastrado para outro cliente. O CPF deve ser único.' });
                }
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Cliente não encontrado.' });
            } else {
                res.json({ message: 'Cliente atualizado com sucesso.' });
            }
        }
    );
});

// DELETE: Excluir um cliente
app.delete('/api/clientes/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM clientes WHERE id = ?`, id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Cliente não encontrado.' });
        } else {
            res.json({ message: 'Cliente excluído com sucesso.' });
        }
    });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});