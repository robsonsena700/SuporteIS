// import fetch from 'node-fetch'; // Native fetch in Node 18+

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'https://localhost:5000/api';

async function testIntegration() {
  console.log('🚀 Starting Integration Test...');

  try {
    const email = `test${Date.now()}@example.com`;
    const password = 'password123';

    // 1. Register
    console.log('\n1. Testing Registration...');
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email,
        password,
        role: 'Técnico',
        profile: 'Suporte Técnico'
      })
    });
    
    if (!registerRes.ok) {
        const error = await registerRes.json();
        console.error('Registration failed:', error);
        return;
    }
    const user = await registerRes.json();
    console.log('✅ Registered:', user.email);

    // 2. Login
    console.log('\n2. Testing Login...');
    const startLogin = Date.now();
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password
      })
    });
    const loginTime = Date.now() - startLogin;
    console.log(`⏱️ Login response time: ${loginTime}ms`);

    if (!loginRes.ok) {
        const error = await loginRes.json();
        console.error('Login failed:', error);
        return;
    }

    // 2.1 Test Invalid Login (Error Handling)
    console.log('\n2.1 Testing Invalid Login...');
    const invalidLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'wrongpassword' })
    });
    if (invalidLoginRes.status === 401 || invalidLoginRes.status === 400) {
        console.log(`✅ Invalid login correctly rejected (${invalidLoginRes.status})`);
    } else {
        console.error(`❌ Invalid login failed to return 401/400. Status: ${invalidLoginRes.status}`);
    }

    const loginData = await loginRes.json();
    console.log('✅ Login successful. Token received.');
    const token = loginData.token;

    // 3. Update Profile
    console.log('\n3. Testing Update Profile...');
    const updateRes = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
            name: 'Updated Name',
            phone: '(11) 99999-9999',
            department: 'IT'
        })
    });

    if (updateRes.ok) {
        const updatedUser = await updateRes.json();
        console.log('✅ Profile updated:', updatedUser.name, updatedUser.phone, updatedUser.department);
    } else {
        const error = await updateRes.json();
        console.error('❌ Profile Update Failed:', error);
    }

    // 4. Create Ticket
    console.log('\n4. Testing Create Ticket...');
    const createRes = await fetch(`${BASE_URL}/tickets`, {
        method: 'POST',
        headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
        subject: 'Test Ticket',
        description: 'This is a test ticket',
        equipment: 'Printer X',
        client_name: 'Client Y',
        priority: 'Alta',
        attachment: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        })
    });

    if (createRes.ok) {
        const ticket = await createRes.json();
        console.log('✅ Ticket created:', ticket.code);
        if (ticket.attachment) console.log('✅ Ticket has attachment');

        // 5. Get ticket details
        console.log('\n5. Fetching ticket details...');
        const detailsRes = await fetch(`${BASE_URL}/tickets/${ticket.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (detailsRes.ok) {
            const details = await detailsRes.json();
            console.log('✅ Ticket details fetched:', details.subject);
        } else {
            console.error('❌ Failed to fetch details');
        }

        // 6. Add a message with attachment
        console.log('\n6. Adding a message with attachment...');
        const msgRes = await fetch(`${BASE_URL}/tickets/${ticket.id}/messages`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                content: 'This is a test message with attachment',
                is_internal: false,
                attachment: 'data:text/plain;base64,SGVsbG8gV29ybGQ='
            })
        });
        if (msgRes.ok) {
            const msg = await msgRes.json();
            console.log('✅ Message added:', msg.content);
            if (msg.attachment) console.log('✅ Message has attachment');
        } else {
            console.error('❌ Failed to add message');
        }

        // 6.5 Get History
        console.log('\n6.5 Fetching History...');
        const historyRes = await fetch(`${BASE_URL}/tickets/${ticket.id}/history`, {
             headers: { Authorization: `Bearer ${token}` }
        });
        if (historyRes.ok) {
            const history = await historyRes.json();
            console.log(`✅ History fetched: ${history.length} items`);
            history.forEach((h: any) => console.log(`   - ${h.change_type}: ${h.details || ''}`));
        } else {
            console.error('❌ Failed to fetch history');
        }

        // 7. List tickets
        console.log('\n7. Listing tickets...');
        const listRes = await fetch(`${BASE_URL}/tickets`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (listRes.ok) {
            const tickets = await listRes.json();
            console.log(`✅ Found ${tickets.length} tickets`);
        } else {
            console.error('❌ Failed to list tickets');
        }

    } else {
        const error = await createRes.json();
        console.error('❌ Create Ticket Failed:', error);
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error);
  }
}

testIntegration();