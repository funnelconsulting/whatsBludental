const express = require('express');
const cors = require('cors');
require("dotenv").config();
const path = require("path");
const { Client, LocalAuth, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');

let sessionObj = {};

const knownEcp = {
  _id: "64e5c95af74004ce77ee8170", 
  name: "ARCHIMEDE FORMAZIONE SRL", 
  groupName: "LeadSystem - Archimede Formazione", 
  waId: {
    server: 'g.us',
    user: '120363254016044512',
    _serialized: '120363254016044512@g.us'
  }
};

mongoose.connect('mongodb+srv://mattianorisbusiness:MAD7389gva@whatsappstore.x0q7aga.mongodb.net/?retryWrites=true&w=majority&appName=WhatsappStore').then(() => {
  const store = new MongoStore({ mongoose: mongoose });
  console.log('MongoDB Connesso!!!')
  let client;
  
  const connectClient = () => {
    client = new Client({
      authStrategy: new RemoteAuth({
        clientId: '2',
        store: store,
        backupSyncIntervalMs: 300000,
      }),
      webVersionCache:{
        type: 'remote', 
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html', 
      },
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // Necessario per ambienti con risorse limitate
          '--disable-gpu'
        ]
      }
    });

  /*WHATSAPP CONNECTION*/
  client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('Client is ready!');
    client.getChats().then(async(chats) => {
      const group1 = chats.filter(c => c.name === "LeadSystem - Ares");
      console.log(group1);
    }).catch((err) => {
        console.error('Si è verificato un errore durante la ricerca della chat:', err);
    });
  });

  client.on("remote_session_saved", () => {
    console.log("Sessione salvata!")
  })

  client.on('disconnect', () => {
    console.log('Il client WhatsApp si è disconnesso. Tentativo di riconnessione...');
    setTimeout(connectClient, 5000);
  });

  client.on('auth_failure', () => {
    console.log('Fallimento dell\'autenticazione. Riavvio del server...');
    process.exit(1);
  });

  app.post('/webhook-lead-bludental-notification', async (req, res) => {
    console.log(req.body)
    try {
        const orientatrice = req.body.orientatrice; 
        const leads = req.body.leads;
        const leadMessage = `È entrata una nuova lead! contattala subito.\n• ${leads.nome} ${leads.cognome} - ${leads.numeroTelefono}`;
        const { waId } = knownEcp;

            await client.sendMessage(waId._serialized, leadMessage)
                .then(() => console.log("Messaggio inviato a", knownEcp.name, "per la lead:", leads.nome, leads.cognome))
                .catch(error => console.error("Errore nell'invio del messaggio:", error));
            console.log(`Messaggio inviato a ${knownEcp.name}`);
        res.status(200).send('Messaggi inviati con successo agli ECP.');
    } catch (error) {
        console.error('Errore durante l\'invio dei messaggi:', error);
        res.status(500).send('Errore durante l\'invio dei messaggi.');
    }
  });

  client.initialize();

  }

  connectClient();
});

const app = express();
app.use(express.static(path.join(__dirname, 'client', 'public')));

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: ["https://test-comparatore.netlify.app", "https://leadsystem-test.netlify.app", "http://localhost:3000", "https://leadsystemfunnel-production.up.railway.app"],
  })
);

const PORT = process.env.PORT || 3080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
