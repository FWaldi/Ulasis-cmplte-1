
import React from 'react';

const BlogPostCard: React.FC<{ title: string; excerpt: string; imgSrc: string; date: string; }> = ({ title, excerpt, imgSrc, date }) => (
    <article className="group">
        <div className="overflow-hidden rounded-xl shadow-lg transition-shadow group-hover:shadow-2xl">
            <img src={imgSrc} alt={title} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" />
        </div>
        <div className="p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{date}</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-brand-primary dark:group-hover:text-brand-accent transition-colors">{title}</h3>
            <p className="text-slate-700 dark:text-slate-300 mt-2">{excerpt}</p>
        </div>
    </article>
);

const BlogPage: React.FC = () => {
    const posts = [
        {
            title: '5 Cara Efektif Mengubah Umpan Balik Negatif Menjadi Peluang',
            excerpt: 'Jangan takut dengan kritik. Pelajari cara memanfaatkan ulasan negatif untuk meningkatkan layanan dan loyalitas pelanggan...',
            imgSrc: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1932&auto=format&fit=crop',
            date: '28 Oktober 2023'
        },
        {
            title: 'Mengapa QR Code adalah Kunci untuk Feedback Real-Time',
            excerpt: 'Di era digital, kecepatan adalah segalanya. Temukan bagaimana QR code sederhana dapat merevolusi cara Anda mengumpulkan...',
            imgSrc: 'https://images.unsplash.com/photo-1604479937254-35a8a72b1146?q=80&w=2070&auto=format&fit=crop',
            date: '15 Oktober 2023'
        },
        {
            title: 'Memahami Analisis Sentimen: Panduan untuk Pemilik Bisnis',
            excerpt: 'AI mungkin terdengar rumit, tetapi analisis sentimen adalah alat yang ampuh dan mudah dipahami. Mari kita bedah...',
            imgSrc: 'https://images.unsplash.com/photo-1677756119517-756a188d2d94?q=80&w=2070&auto=format&fit=crop',
            date: '1 Oktober 2023'
        }
    ];

    return (
        <main className="container mx-auto px-4 sm:px-6 lg:p-8 pt-16 pb-20">
            <section className="text-center max-w-3xl mx-auto mb-12">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter mb-4 text-slate-900 dark:text-white">
                    Blog ULASIS
                </h1>
                <p className="text-lg text-slate-700 dark:text-slate-300">
                    Insight, tips, dan cerita untuk membantu Anda membangun hubungan yang lebih baik dengan pelanggan.
                </p>
            </section>

            <section className="grid md:grid-cols-3 gap-8">
                {posts.map(post => <BlogPostCard key={post.title} {...post} />)}
            </section>
        </main>
    );
};

export default BlogPage;
