
async function debugCreateTicket() {
    const API_URL = 'http://localhost:3000'; // Ajuste a porta se necessário

    const payload = {
        subject: "Teste Debug " + Date.now(),
        description: "Descrição de teste para debug de criação de ticket.",
        equipment: "Computador Dell",
        client_name: "Cliente Teste", // Note o snake_case que o api.ts envia
        unit: "Unidade Central",
        municipality: "São Paulo",
        uf: "SP",
        priority: "low",
        status: "open",
        equipmentDetails: {
             model: "Dell Latitude",
             serialNumber: "SN123456",
             warranty: "2025-12-31"
        }
    };

    console.log("Tentando criar ticket com payload:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${API_URL}/api/tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Simula um token se necessário, ou assume que a rota é protegida e falhará 401
                // Se falhar 401, sabemos que o servidor responde.
            },
            body: JSON.stringify(payload)
        });

        const data = await response.text();
        console.log(`Status: ${response.status}`);
        try {
             console.log("Response:", JSON.parse(data));
        } catch (e) {
             console.log("Response text:", data);
        }
        
    } catch (error: any) {
        console.error("Erro ao criar ticket:", error.message);
    }
}

debugCreateTicket();
