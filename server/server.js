const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors'); // Importe o pacote cors

const app = express();
const PORT = 3000;
const DB_FILE = './server/database.sqlite'; // Caminho para o arquivo do banco de dados

// Configurações do Express
app.use(express.json()); // Permite que o Express leia JSON no corpo das requisições
app.use(cors()); // Use o middleware CORS para permitir requisições do frontend

// Conecta ao banco de dados SQLite
const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        // Cria a tabela 'bills' se ela não existir
        db.run(`CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            clientName TEXT NOT NULL,
            clientPhone TEXT NOT NULL,
            itemName TEXT NOT NULL,
            itemPrice REAL NOT NULL,
            totalAmount REAL NOT NULL
        )`, (err) => {
            if (err) {
                console.error('Erro ao criar tabela:', err.message);
            } else {
                console.log('Tabela "bills" criada ou já existe.');
            }
        });
    }
});

// --- Rotas da API ---

// GET: Obter todas as contas
app.get('/api/bills', (req, res) => {
    db.all('SELECT * FROM bills', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST: Adicionar uma nova conta
app.post('/api/bills', (req, res) => {
    const { clientName, clientPhone, itemName, itemPrice, totalAmount } = req.body;

    if (!clientName || !clientPhone || !itemName || !itemPrice || !totalAmount) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    db.run(`INSERT INTO bills (clientName, clientPhone, itemName, itemPrice, totalAmount) VALUES (?, ?, ?, ?, ?)`,
        [clientName, clientPhone, itemName, itemPrice, totalAmount],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json({ id: this.lastID, ...req.body }); // Retorna o ID da nova conta
        }
    );
});

// PUT: Atualizar uma conta existente
app.put('/api/bills/:id', (req, res) => {
    const { id } = req.params;
    const { clientName, clientPhone, itemName, itemPrice, totalAmount } = req.body;

    if (!clientName || !clientPhone || !itemName || !itemPrice || !totalAmount) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    db.run(`UPDATE bills SET clientName = ?, clientPhone = ?, itemName = ?, itemPrice = ?, totalAmount = ? WHERE id = ?`,
        [clientName, clientPhone, itemName, itemPrice, totalAmount, id],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Conta não encontrada.' });
            } else {
                res.json({ message: 'Conta atualizada com sucesso.' });
            }
        }
    );
});

// DELETE: Excluir uma conta
app.delete('/api/bills/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM bills WHERE id = ?`, id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Conta não encontrada.' });
        } else {
            res.json({ message: 'Conta excluída com sucesso.' });
        }
    });
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});