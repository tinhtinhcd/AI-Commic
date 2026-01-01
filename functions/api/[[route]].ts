
import { Client } from '@neondatabase/serverless';

// Hardcoded for Dev Convenience. In Prod, set this in Cloudflare Pages Settings.
const CONNECTION_STRING = 'postgresql://neondatabase_owner:npg_IbiX43aqpjKE@ep-royal-grass-ah3an10g-pooler.c-3.us-east-1.aws.neon.tech/neondatabase?sslmode=require';

// --- SQL SCHEMA DEFINITION (Code-First approach) ---
const SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        title TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
`;

interface Env {
  DATABASE_URL: string;
}

export const onRequest = async (context: any) => {
  const url = new URL(context.request.url);
  const method = context.request.method;
  const path = url.pathname.replace('/api/', ''); 

  // Use env var if available, else fallback to hardcoded string
  const dbUrl = context.env.DATABASE_URL || CONNECTION_STRING;
  // Use Client instead of Pool for serverless function scope
  const client = new Client(dbUrl);
  await client.connect();

  // Helper to ensure DB is ready (Lazy Initialization)
  const ensureSchema = async () => {
      console.log("Checking DB Schema...");
      await client.query(SCHEMA_SQL);
  };

  try {
    // --- SYSTEM ROUTES ---
    if (path === 'system/init' && method === 'GET') {
        await ensureSchema();
        return new Response(JSON.stringify({ status: "Database initialized successfully" }), { headers: { 'Content-Type': 'application/json' } });
    }

    // --- AUTH ROUTES ---
    if (path === 'auth/login' && method === 'POST') {
      const body: any = await context.request.json();
      const { email, password } = body;
      
      try {
          const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);
          
          if (rows.length === 0) return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
          
          const user = rows[0];
          // Simple password check for demo. Use bcrypt in production.
          if (user.password !== password) return new Response(JSON.stringify({ error: "Invalid password" }), { status: 401 });
          
          return new Response(JSON.stringify(user.data), { headers: { 'Content-Type': 'application/json' } });
      } catch (e: any) {
          if (e.code === '42P01') { 
              await ensureSchema();
              return new Response(JSON.stringify({ error: "System initialized. Please try again." }), { status: 503 });
          }
          throw e;
      }
    }

    if (path === 'auth/register' && method === 'POST') {
      const body: any = await context.request.json();
      const { id, email, password, data } = body;

      try {
        await client.query(
            'INSERT INTO users (id, email, password, data) VALUES ($1, $2, $3, $4)',
            [id, email, password, JSON.stringify(data)]
        );
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      } catch (e: any) {
        if (e.code === '42P01') {
            await ensureSchema();
            await client.query(
                'INSERT INTO users (id, email, password, data) VALUES ($1, $2, $3, $4)',
                [id, email, password, JSON.stringify(data)]
            );
            return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
        }
        if (e.code === '23505') {
             return new Response(JSON.stringify({ error: "Email already exists" }), { status: 400 });
        }
        throw e;
      }
    }

    // --- ADMIN ROUTES (NEW) ---
    
    if (path === 'admin/users' && method === 'GET') {
        try {
            const { rows } = await client.query('SELECT data FROM users ORDER BY created_at DESC LIMIT 100');
            const users = rows.map(r => r.data);
            return new Response(JSON.stringify(users), { headers: { 'Content-Type': 'application/json' } });
        } catch (e: any) {
            if (e.code === '42P01') return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
            throw e;
        }
    }

    if (path === 'admin/stats' && method === 'GET') {
        try {
            const userCountRes = await client.query('SELECT COUNT(*) FROM users');
            const projectCountRes = await client.query('SELECT COUNT(*) FROM projects WHERE is_active = TRUE');
            
            const stats = {
                totalUsers: parseInt(userCountRes.rows[0].count),
                activeProjects: parseInt(projectCountRes.rows[0].count),
                revenue: 0, // Placeholder for future logic
                flaggedContent: 0 // Placeholder
            };
            return new Response(JSON.stringify(stats), { headers: { 'Content-Type': 'application/json' } });
        } catch (e: any) {
            return new Response(JSON.stringify({ totalUsers: 0, activeProjects: 0 }), { headers: { 'Content-Type': 'application/json' } });
        }
    }

    // --- PROJECT ROUTES ---
    
    if (path.startsWith('projects') && method === 'GET') {
        const userId = url.searchParams.get('userId');
        const type = url.searchParams.get('type');
        
        let query = 'SELECT data FROM projects WHERE 1=1';
        const params: any[] = [];
        
        if (userId) {
            params.push(userId);
            query += ` AND owner_id = $${params.length}`;
        }
        
        if (type === 'active') {
            // Logic: is_active = true
            query += ` AND is_active = TRUE`;
        }

        try {
            const { rows } = await client.query(query, params);
            const projects = rows.map(r => r.data);
            return new Response(JSON.stringify(projects), { headers: { 'Content-Type': 'application/json' } });
        } catch (e: any) {
            if (e.code === '42P01') { 
                await ensureSchema(); 
                return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
            }
            throw e;
        }
    }

    if (path === 'projects/save' && method === 'POST') {
        const body: any = await context.request.json();
        const { project, isActive } = body;
        // Default isActive to true if undefined, but handle explicit false from Library saves
        const activeStatus = isActive !== undefined ? isActive : true;
        
        try {
            if (activeStatus && project.ownerId) {
                const existsRes = await client.query(
                    'SELECT 1 FROM projects WHERE id = $1 AND is_active = TRUE', 
                    [project.id]
                );
                const isUpdate = existsRes.rowCount > 0;

                if (!isUpdate) {
                    const countRes = await client.query(
                        'SELECT COUNT(*) FROM projects WHERE owner_id = $1 AND is_active = TRUE',
                        [project.ownerId]
                    );
                    const currentCount = parseInt(countRes.rows[0].count);
                    
                    if (currentCount >= 3) {
                        return new Response(JSON.stringify({ error: "SLOTS_FULL", message: "Maximum 3 active projects allowed." }), { status: 403 });
                    }
                }
            }

            await client.query(
                `INSERT INTO projects (id, owner_id, title, is_active, data) 
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO UPDATE 
                 SET title = EXCLUDED.title, is_active = EXCLUDED.is_active, data = EXCLUDED.data, updated_at = NOW()`,
                [project.id, project.ownerId, project.title, activeStatus, JSON.stringify(project)]
            );
            return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e: any) {
            if (e.code === '42P01') {
                await ensureSchema();
                await client.query(
                    `INSERT INTO projects (id, owner_id, title, is_active, data) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO UPDATE 
                     SET title = EXCLUDED.title, is_active = EXCLUDED.is_active, data = EXCLUDED.data, updated_at = NOW()`,
                    [project.id, project.ownerId, project.title, activeStatus, JSON.stringify(project)]
                );
                return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
            }
            throw e;
        }
    }

    if (path.startsWith('projects/') && method === 'DELETE') {
        const projectId = path.split('/')[1];
        await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response("Not Found", { status: 404 });

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message, code: error.code }), { status: 500 });
  } finally {
    context.waitUntil(client.end());
  }
};
