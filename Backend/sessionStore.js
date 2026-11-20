const { Store } = require("express-session");

// Shared PostgreSQL storage keeps sessions available across Vercel instances.
class PgSession extends Store {
    constructor(pool) {
        super();
        this.pool = pool;
        this.ready = null;
    }

    async query(sql, values) {
        if (!this.ready) {
            this.ready = this.pool.query(`
                CREATE TABLE IF NOT EXISTS public.pos_sessions (
                    sid TEXT PRIMARY KEY,
                    sess JSONB NOT NULL,
                    expire TIMESTAMPTZ NOT NULL
                )
            `).catch(error => {
                this.ready = null;
                throw error;
            });
        }
        await this.ready;
        return this.pool.query(sql, values);
    }

    get(sid, callback) {
        this.query("SELECT sess FROM public.pos_sessions WHERE sid = $1 AND expire > NOW()", [sid])
            .then(({ rows }) => callback(null, rows[0]?.sess ?? null), callback);
    }

    set(sid, sess, callback = () => {}) {
        const expire = this.expiration(sess);
        this.query(`INSERT INTO public.pos_sessions (sid, sess, expire) VALUES ($1, $2, $3)
            ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire`,
        [sid, JSON.stringify(sess), expire]).then(() => callback(null), callback);
    }

    touch(sid, sess, callback = () => {}) {
        this.query("UPDATE public.pos_sessions SET expire = $2 WHERE sid = $1", [sid, this.expiration(sess)])
            .then(() => callback(null), callback);
    }

    destroy(sid, callback = () => {}) {
        this.query("DELETE FROM public.pos_sessions WHERE sid = $1", [sid])
            .then(() => callback(null), callback);
    }

    expiration(sess) {
        return sess.cookie?.expires ? new Date(sess.cookie.expires) : new Date(Date.now() + 8 * 60 * 60 * 1000);
    }
}

module.exports = PgSession;
