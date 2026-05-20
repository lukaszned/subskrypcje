import type { BillingCycle, SubscriptionCategory } from '../types/api';

export type EstimatedCostPlan = {
  name: string;
  price: number;
  billingCycle: BillingCycle;
  confidence: number;
  note?: string;
};

export type EstimatedCostResult = {
  serviceName: string;
  suggestedCategory: SubscriptionCategory | null;
  plans: EstimatedCostPlan[];
  message: string;
  source: 'openai' | 'guardrail' | 'unavailable';
};

type OpenAiEstimatePayload = {
  kind: 'digital_subscription' | 'not_supported' | 'unknown';
  currency: 'PLN';
  suggestedCategory: SubscriptionCategory | null;
  plans: EstimatedCostPlan[];
  message: string;
};

const PHYSICAL_SERVICE_HINTS = [
  'czynsz',
  'mieszkanie',
  'ubezpieczenie',
  'leasing',
  'kredyt',
  'rata',
  'samochod',
  'samochód',
  'prad',
  'prąd',
  'gaz',
  'woda',
  'internet domowy',
];

const FALLBACK_MODEL = 'gpt-4.1-mini';

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: {
      type: 'string',
      enum: ['digital_subscription', 'not_supported', 'unknown'],
    },
    currency: {
      type: 'string',
      enum: ['PLN'],
    },
    suggestedCategory: {
      anyOf: [
        {
          type: 'string',
          enum: [
            'entertainment',
            'utilities',
            'health',
            'education',
            'productivity',
            'shopping',
            'finance',
            'transport',
            'other',
          ],
        },
        { type: 'null' },
      ],
    },
    plans: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          billingCycle: {
            type: 'string',
            enum: ['monthly', 'yearly', 'weekly', 'one_time', 'custom'],
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
          note: { type: 'string' },
        },
        required: ['name', 'price', 'billingCycle', 'confidence', 'note'],
      },
    },
    message: { type: 'string' },
  },
  required: ['kind', 'currency', 'suggestedCategory', 'plans', 'message'],
} as const;

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function looksLikePhysicalService(serviceName: string) {
  const normalized = normalize(serviceName);
  return PHYSICAL_SERVICE_HINTS.some((hint) => normalized.includes(normalize(hint)));
}

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === 'string') return payload.output_text;

  const content = payload?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((item: any) => item?.text || item?.content || '')
    ?.filter(Boolean)
    ?.join('\n');

  return content || '';
}

function parseEstimate(rawText: string): OpenAiEstimatePayload | null {
  if (!rawText.trim()) return null;

  try {
    return JSON.parse(rawText) as OpenAiEstimatePayload;
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as OpenAiEstimatePayload;
    } catch {
      return null;
    }
  }
}

function sanitizePlans(plans: EstimatedCostPlan[] | undefined): EstimatedCostPlan[] {
  if (!Array.isArray(plans)) return [];

  return plans
    .filter((plan) => Number.isFinite(plan.price) && plan.price > 0 && plan.name?.trim())
    .slice(0, 4)
    .map((plan) => ({
      name: plan.name.trim(),
      price: Number(plan.price.toFixed(2)),
      billingCycle: plan.billingCycle || 'monthly',
      confidence: Math.max(0, Math.min(1, Number(plan.confidence ?? 0.65))),
      note: plan.note?.trim(),
    }));
}

export async function fetchEstimatedCost(serviceName: string): Promise<EstimatedCostResult> {
  const trimmedName = serviceName.trim();

  if (trimmedName.length < 3) {
    return {
      serviceName: trimmedName,
      suggestedCategory: null,
      plans: [],
      message: 'Wpisz przynajmniej 3 znaki nazwy usługi.',
      source: 'guardrail',
    };
  }

  if (looksLikePhysicalService(trimmedName)) {
    return {
      serviceName: trimmedName,
      suggestedCategory: null,
      plans: [],
      message: 'To wygląda bardziej jak rachunek lub usługa fizyczna. Wpisz koszt ręcznie, żeby uniknąć błędnej podpowiedzi.',
      source: 'guardrail',
    };
  }

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const model = process.env.EXPO_PUBLIC_OPENAI_MODEL || FALLBACK_MODEL;

  if (!apiKey) {
    return {
      serviceName: trimmedName,
      suggestedCategory: null,
      plans: [],
      message: 'Predykcja AI jest gotowa, ale brakuje EXPO_PUBLIC_OPENAI_API_KEY. Możesz nadal wpisać koszt ręcznie.',
      source: 'unavailable',
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 700,
      instructions:
        'Jesteś asystentem fintech dla aplikacji Sub-Sentry. Zwracasz wyłącznie ustrukturyzowany JSON. Szacujesz ceny cyfrowych subskrypcji, aplikacji, SaaS, VOD, muzyki, edukacji i narzędzi online dla rynku polskiego w PLN. Ignoruj usługi fizyczne i rachunki takie jak czynsz, ubezpieczenie auta, energia, gaz, kredyt, leasing lub najem.',
      input:
        `Podaj realistyczne warianty cenowe w PLN dla cyfrowej usługi/subskrypcji: "${trimmedName}". ` +
        'Jeśli to nie jest cyfrowa subskrypcja, ustaw kind=not_supported i zwróć pustą listę plans. ' +
        'Jeśli nie masz pewności, zwróć maksymalnie 2 ostrożne szacunki z niższym confidence.',
      text: {
        format: {
          type: 'json_schema',
          name: 'subscription_price_estimate',
          strict: true,
          schema: responseSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    return {
      serviceName: trimmedName,
      suggestedCategory: null,
      plans: [],
      message: 'Nie udało się pobrać podpowiedzi AI. Wpisz koszt ręcznie albo spróbuj później.',
      source: 'unavailable',
    };
  }

  const json = await response.json();
  const parsed = parseEstimate(extractOutputText(json));

  if (!parsed || parsed.kind !== 'digital_subscription') {
    return {
      serviceName: trimmedName,
      suggestedCategory: parsed?.suggestedCategory ?? null,
      plans: [],
      message: parsed?.message || 'AI nie znalazło wiarygodnych cen tej usługi. Wpisz koszt ręcznie.',
      source: 'openai',
    };
  }

  const plans = sanitizePlans(parsed.plans);

  return {
    serviceName: trimmedName,
    suggestedCategory: parsed.suggestedCategory,
    plans,
    message: plans.length > 0
      ? parsed.message || 'Znaleźliśmy orientacyjne warianty cenowe. Potwierdź je przed zapisem.'
      : 'AI nie znalazło wiarygodnych cen tej usługi. Wpisz koszt ręcznie.',
    source: 'openai',
  };
}
