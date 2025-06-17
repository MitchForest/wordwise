'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "How does WordWise help me write better content?",
    answer: "WordWise combines AI-powered writing assistance, real-time grammar checking, and SEO optimization tools to help you create high-quality content faster. Our AI suggests improvements, catches errors, and ensures your content is optimized for search engines."
  },
  {
    question: "Can I try WordWise for free?",
    answer: "Yes! We offer a free Starter plan that includes 5 documents per month with basic features. You can also start a 14-day free trial of our Pro plan to access all premium features."
  },
  {
    question: "Is my content secure?",
    answer: "Absolutely. We use industry-standard encryption to protect your data both in transit and at rest. Your documents are stored securely and are only accessible by you. We never share or use your content for training our AI models."
  },
  {
    question: "Can I collaborate with my team?",
    answer: "Yes, our Team plan includes collaboration features that allow multiple team members to work on documents together. You can share documents, leave comments, and track changes in real-time."
  },
  {
    question: "What formats can I export my documents in?",
    answer: "Pro and Team plans support exporting to multiple formats including Markdown, HTML, PDF, and Word documents. You can also copy formatted text directly to paste into your CMS or blog platform."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied with WordWise, contact our support team within 30 days of purchase for a full refund."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-gray-600">
            Everything you need to know about WordWise
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{faq.question}</span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 