I'm excited to introduce WordWise AI, a new writing assistant I'm building specifically for content creators who want to write SEO-optimized and grammatically perfect blog posts.

In just 24 hours, I've put together this MVP. Right now, it uses:
- `nspell` for quick spell-checking
- `good-writer` for style suggestions
- A custom-built local tool for basic grammar checking

My immediate next steps are to integrate readability analysis and a dedicated SEO tool to complete the core local analysis engine. Once that's solid, I'll be layering in AI features, allowing users to generate and regenerate entire blog posts.

The technical foundation is already in place. User authentication is handled by `better-auth`, and all documents are securely stored in a Supabase Postgres database. The entire application is live and deployed on Vercel.

I'm really looking forward to building this out more over the next few days and creating the ultimate tool for bloggers! 