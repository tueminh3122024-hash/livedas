const { Pool } = require('pg');

async function run() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54342/postgres'
  });

  try {
    console.log('Connecting to Supabase Local Database...');
    const client = await pool.connect();
    
    try {
      console.log('1. Updating trigger function public.handle_new_user...');
      await client.query(`
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        DECLARE
          default_role VARCHAR(20) := 'buyer';
        BEGIN
          -- Nếu email đăng ký là admin@livedas.com thì tự động gán role admin cho tiện test
          IF new.email = 'admin@livedas.com' THEN
            default_role := 'admin';
          ELSE
            default_role := COALESCE(new.raw_user_meta_data->>'role', 'buyer');
          END IF;

          INSERT INTO public.profiles (id, name, email, role, phone)
          VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
            new.email,
            default_role,
            new.raw_user_meta_data->>'phone'
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `);
      console.log('Trigger function updated successfully.');

      console.log('2. Promoting dau@livedas.com to seller in profiles...');
      const profileRes = await client.query(`
        UPDATE public.profiles
        SET role = 'seller'
        WHERE email = 'dau@livedas.com'
        RETURNING id, name, role;
      `);

      if (profileRes.rows.length === 0) {
        console.log('Warning: dau@livedas.com was not found in public.profiles. Checking auth.users...');
        const authRes = await client.query(`
          SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'dau@livedas.com';
        `);
        
        if (authRes.rows.length > 0) {
          const user = authRes.rows[0];
          console.log(`User found in auth.users with ID ${user.id}. Creating profile manually...`);
          
          await client.query(`
            INSERT INTO public.profiles (id, name, email, role, phone)
            VALUES ($1, $2, $3, 'seller', $4)
            ON CONFLICT (id) DO UPDATE SET role = 'seller'
            RETURNING id, name, role;
          `, [
            user.id,
            user.raw_user_meta_data?.name || 'Vựa Sỉ Dầu',
            user.email,
            user.raw_user_meta_data?.phone || '0901234567'
          ]);
          console.log('Profile created manually.');
        } else {
          console.error('Error: User dau@livedas.com does not exist in auth.users either. Please register them first.');
          return;
        }
      } else {
        console.log(`Promoted user: ${JSON.stringify(profileRes.rows[0])}`);
      }

      // Lấy ID của user dau@livedas.com
      const userRes = await client.query(`SELECT id FROM public.profiles WHERE email = 'dau@livedas.com'`);
      const userId = userRes.rows[0].id;

      console.log('3. Checking/Creating sellers profile row...');
      const sellerRes = await client.query(`
        SELECT id FROM public.sellers WHERE user_id = $1
      `, [userId]);

      if (sellerRes.rows.length === 0) {
        console.log('Sellers row missing, creating manually...');
        // Đã có handle_seller_profile_sync trigger nhưng có thể do chạy trước đó chưa đổi role.
        // Hãy thực hiện UPDATE profiles để kích hoạt trigger, hoặc chèn thủ công.
        // Kích hoạt lại bằng cách trigger update name nhẹ
        await client.query(`
          UPDATE public.profiles SET name = name WHERE id = $1
        `, [userId]);
        
        // Kiểm tra lại
        const checkSeller = await client.query(`SELECT id FROM public.sellers WHERE user_id = $1`, [userId]);
        if (checkSeller.rows.length === 0) {
          console.log('Trigger did not insert sellers row. Inserting manually...');
          await client.query(`
            INSERT INTO public.sellers (id, name, phone, zalo_id, region, province, verified, rating, status, user_id, specialty)
            VALUES ($1, 'Vựa Sỉ Dầu', '0901234567', '0901234567', 'Miền Tây', 'Cần Thơ', true, 5.0, 'online', $1, ARRAY[]::TEXT[])
          `, [userId]);
        }
      }
      console.log('Sellers row verified/created.');

      console.log('4. Initializing and crediting wallet with 100,000,000 Credits...');
      await client.query(`
        INSERT INTO public.wallets (user_id, balance, locked_balance)
        VALUES ($1, 100000000, 0)
        ON CONFLICT (user_id) DO UPDATE
        SET balance = 100000000;
      `, [userId]);
      console.log('Wallet successfully credited with 100M Credits.');

      console.log('All database checks completed successfully!');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database run error:', err);
  } finally {
    await pool.end();
  }
}

run();
