// import fetch from 'node-fetch'; // Native fetch in Node 18+

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const REPORTS_BASE_URL = 'https://localhost:5000/api';

async function testReports() {
  console.log('🚀 Starting Reports Integration Test...');

  try {
    const email = `test_report_${Date.now()}@example.com`;
    const password = 'password123';

    // 1. Register
    console.log('\n1. Registering User...');
    const registerRes = await fetch(`${REPORTS_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Report Tester',
        email,
        password,
        role: 'Técnico',
        profile: 'Suporte Técnico'
      })
    });
    
    if (!registerRes.ok) {
        console.error('Registration failed:', await registerRes.json());
        return;
    }
    
    const user = await registerRes.json();
    console.log('✅ User registered.');

    // 1.1 Login to get token
    const loginRes = await fetch(`${REPORTS_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    if (!loginRes.ok) {
        console.error('Login failed:', await loginRes.json());
        return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Logged in.');

    // 2. Create Data
    console.log('\n2. Creating Tickets with different priorities/statuses...');
    
    const ticketTypes = [
        { priority: 'Alta', status: 'Aberto' },
        { priority: 'Média', status: 'Em Andamento' },
        { priority: 'Baixa', status: 'Resolvido' },
        { priority: 'Alta', status: 'Aberto' }
    ];

    for (const t of ticketTypes) {
        await fetch(`${REPORTS_BASE_URL}/tickets`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                subject: `Test ${t.priority} ${t.status}`,
                description: 'Test Description',
                equipment: 'PC',
                client_name: 'Client X',
                priority: t.priority,
                status: t.status
            })
        });
    }
    console.log(`✅ Created ${ticketTypes.length} tickets.`);

    // 3. Test Filters
    console.log('\n3. Testing Filters...');

    // 3.1 Filter by Status: Aberto
    console.log('   - Filter: Status = Aberto');
    const resAberto = await fetch(`${REPORTS_BASE_URL}/tickets?status=Aberto`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!resAberto.ok) {
        console.error('Failed to fetch Aberto:', await resAberto.text());
        return;
    }
    const ticketsAberto = await resAberto.json();
    console.log(`     Found: ${ticketsAberto.length} (Expected >= 2)`);
    if (Array.isArray(ticketsAberto) && ticketsAberto.every((t: any) => t.status === 'Aberto')) {
        console.log('     ✅ All returned tickets have status Aberto');
    } else {
        console.error('     ❌ Filter failed: Found non-Aberto tickets or invalid response');
    }

    // 3.2 Filter by Priority: Média
    console.log('   - Filter: Priority = Média');
    const resMedia = await fetch(`${REPORTS_BASE_URL}/tickets?priority=Média`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const ticketsMedia = await resMedia.json();
    console.log(`     Found: ${ticketsMedia.length} (Expected >= 1)`);
    if (ticketsMedia.every((t: any) => t.priority === 'Média')) {
        console.log('     ✅ All returned tickets have priority Média');
    } else {
        console.error('     ❌ Filter failed: Found non-Média tickets');
    }

    // 3.3 Filter by Date (Today)
    // Use local date to match environment
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    console.log(`   - Filter: Date = ${today}`);
    const resDate = await fetch(`${REPORTS_BASE_URL}/tickets?startDate=${today}&endDate=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const ticketsDate = await resDate.json();
    console.log(`     Found: ${ticketsDate.length} (Expected >= 4)`);
    
    // 3.4 Combined Filter
    console.log('   - Filter: Status = Aberto AND Priority = Alta');
    const resCombined = await fetch(`${REPORTS_BASE_URL}/tickets?status=Aberto&priority=Alta`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const ticketsCombined = await resCombined.json();
    console.log(`     Found: ${ticketsCombined.length} (Expected >= 2)`);
    if (ticketsCombined.every((t: any) => t.status === 'Aberto' && t.priority === 'Alta')) {
        console.log('     ✅ All returned tickets match combined filter');
    } else {
        console.error('     ❌ Filter failed');
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error);
  }
}

testReports();
