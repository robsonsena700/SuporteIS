
import dotenv from 'dotenv';
// Polyfill fetch if needed (Node < 18)
// import fetch from 'node-fetch'; 

dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'https://localhost:5000/api';

async function test() {
    try {
        console.log('1. Registering new user...');
        const email = `debug_${Date.now()}@test.com`;
        const password = 'password123';
        
        const regRes = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Debug User',
                email,
                password,
                role: 'Cliente',
                profile: 'Cliente',
                company: 'Debug Corp',
                phone: '1199999999',
                department: 'TI'
            })
        });

        if (!regRes.ok) {
            const text = await regRes.text();
            console.error('Registration failed:', text);
            // If email exists, proceed to login
            if (!text.includes('Email já cadastrado')) {
                 return;
            }
            console.log('User might already exist, trying login...');
        } else {
             console.log('Registered successfully.');
        }

        console.log('2. Logging in...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('Token received:', token ? 'Yes' : 'No');

        console.log('3. Creating ticket...');
        const ticketPayload = {
            subject: "Debug Ticket HTTP",
            description: "Testing creation via script",
            equipment: "Sistema",
            client_name: "Debug Corp",
            priority: "Média",
            status: "Aberto",
            unit: "Unit 1",
            municipality: "City",
            uf: "SP",
            attachment: "[]"
        };

        const createRes = await fetch(`${BASE_URL}/tickets`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(ticketPayload)
        });

        if (!createRes.ok) {
            console.error('Create Ticket Failed:', createRes.status, createRes.statusText);
            console.error('Response:', await createRes.text());
        } else {
            console.log('Ticket Created Successfully:', await createRes.json());
        }

    } catch (e) {
        console.error('Script error:', e);
    }
}

test();
