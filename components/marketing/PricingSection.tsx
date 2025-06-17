import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out WordWise',
    features: [
      '5 documents per month',
      'Basic grammar checking',
      'Auto-save',
      'Document recovery',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    description: 'For serious content creators',
    features: [
      'Unlimited documents',
      'Advanced grammar & style checking',
      'AI writing assistant',
      'SEO optimization tools',
      'Priority support',
      'Export to multiple formats',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: 'per month',
    description: 'For teams and agencies',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Collaboration tools',
      'Admin dashboard',
      'API access',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your needs. Upgrade or downgrade anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`rounded-2xl p-8 ${
                plan.highlighted
                  ? 'bg-blue-600 text-white ring-4 ring-blue-600 ring-opacity-50 scale-105'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <h3 className={`text-2xl font-bold mb-2 ${
                plan.highlighted ? 'text-white' : 'text-gray-900'
              }`}>
                {plan.name}
              </h3>
              <p className={`mb-6 ${
                plan.highlighted ? 'text-blue-100' : 'text-gray-600'
              }`}>
                {plan.description}
              </p>
              
              <div className="mb-6">
                <span className={`text-4xl font-bold ${
                  plan.highlighted ? 'text-white' : 'text-gray-900'
                }`}>
                  {plan.price}
                </span>
                <span className={`text-lg ${
                  plan.highlighted ? 'text-blue-100' : 'text-gray-600'
                }`}>
                  /{plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                      plan.highlighted ? 'text-white' : 'text-green-500'
                    }`} />
                    <span className={plan.highlighted ? 'text-blue-50' : 'text-gray-700'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full ${
                  plan.highlighted
                    ? 'bg-white text-blue-600 hover:bg-gray-100'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 