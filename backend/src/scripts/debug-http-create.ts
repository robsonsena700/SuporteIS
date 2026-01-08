
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

// Carregar .env da raiz do backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function debugHttpCreate() {
    const API_URL = 'http://localhost:3000/api';
    const SECRET = process.env.JWT_SECRET || 'secret'; 
    
    console.log("Usando JWT Secret:", SECRET); // Debug (cuidado em prod)
    
    // 1. Gerar Token Mock
    // Preciso de um ID de usuário válido. Vou usar o mesmo do teste anterior se possível, ou um aleatório se o banco não checar FK na hora de gerar token (mas checka na hora de inserir ticket).
    // O script anterior achou: 716b4df0-91b1-458f-89fc-c3f9eec606d8
    const userId = '716b4df0-91b1-458f-89fc-c3f9eec606d8'; 
    
    const token = jwt.sign(
        { id: userId, role: 'Cliente', name: 'Debug User' },
        SECRET,
        { expiresIn: '1h' }
    );
    
    console.log("Token gerado:", token);

    const payload = {
        subject: "Teste HTTP Auth " + Date.now(),
        description: "Teste via script com token manual",
        equipment: "Sistema",
        client_name: "Cliente HTTP",
        unit: "Unidade HTTP",
        municipality: "São Paulo",
        uf: "SP",
        priority: "high",
        status: "Aberto",
        attachment: JSON.stringify([{ data: "data:image/png;base64,fake", name: "test.png" }]),
        equipmentDetails: {
             model: "Sistema Web",
             serialNumber: "",
             warranty: ""
        }
    };

    try {
        console.log("Enviando POST para", `${API_URL}/tickets`);
        const response = await fetch(`${API_URL}/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        try {
            console.log("Response:", JSON.parse(text));
        } catch (e) {
            console.log("Response Text:", text);
        }
    } catch (error: any) {
        console.error("Erro no request:", error.message);
    }
}

debugHttpCreate();
