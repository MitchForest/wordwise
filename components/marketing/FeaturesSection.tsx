import { MessageSquare, Target, FileText, Zap, Shield, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: "AI-Powered Writing",
    description: "Get intelligent suggestions and optimizations as you write with our advanced AI assistant."
  },
  {
    icon: Target,
    title: "SEO Optimization",
    description: "Real-time SEO scoring and keyword optimization to help your content rank higher."
  },
  {
    icon: FileText,
    title: "Grammar Checking",
    description: "Built-in grammar and style checking to ensure your content is error-free."
  },
  {
    icon: Zap,
    title: "Auto-Save",
    description: "Never lose your work with automatic saving and document recovery features."
  },
  {
    icon: Shield,
    title: "Secure Storage",
    description: "Your documents are securely stored and accessible from anywhere."
  },
  {
    icon: BarChart3,
    title: "Content Analytics",
    description: "Track your content performance with detailed analytics and insights."
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Everything you need to write better</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features to help you create engaging, SEO-optimized content faster than ever.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="p-3 bg-blue-100 rounded-lg w-fit mb-4">
                <feature.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 