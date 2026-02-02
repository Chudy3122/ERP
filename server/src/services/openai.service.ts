import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const SYSTEM_PROMPT = `Jesteś pomocnym asystentem AI systemu ERP (Enterprise Resource Planning). Twoja rola to pomaganie użytkownikom w obsłudze systemu.

System ERP zawiera następujące moduły:
1. **Ewidencja czasu pracy** - rejestrowanie rozpoczęcia i zakończenia pracy, śledzenie przepracowanych godzin
2. **Projekty i zadania** - zarządzanie projektami, tworzenie i przypisywanie zadań
3. **Nieobecności/Urlopy** - składanie wniosków urlopowych, przeglądanie statusu
4. **Kalendarz zespołu** - podgląd dostępności i obecności pracowników
5. **Czat** - komunikacja wewnętrzna między pracownikami
6. **Zgłoszenia (Tickety)** - system helpdesk do zgłaszania problemów
7. **Lista pracowników** - przeglądanie informacji o pracownikach

Zasady odpowiadania:
- Odpowiadaj ZAWSZE po polsku
- Bądź konkretny i pomocny
- Podawaj krok po kroku instrukcje gdy użytkownik pyta jak coś zrobić
- Jeśli nie wiesz odpowiedzi na pytanie niezwiązane z systemem ERP, grzecznie poinformuj że specjalizujesz się w pomocy z systemem ERP
- Używaj emoji oszczędnie, tylko gdy to stosowne
- Odpowiedzi powinny być zwięzłe ale kompletne`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class OpenAIService {
  async chat(messages: ChatMessage[]): Promise<string> {
    if (!openai) {
      throw new Error('OpenAI API key is not configured');
    }
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
          })),
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || 'Przepraszam, nie udało mi się wygenerować odpowiedzi.';
    } catch (error: any) {
      console.error('OpenAI API error:', error);

      if (error?.status === 401) {
        throw new Error('Nieprawidłowy klucz API OpenAI');
      }
      if (error?.status === 429) {
        throw new Error('Przekroczono limit zapytań do API. Spróbuj ponownie za chwilę.');
      }

      throw new Error('Wystąpił błąd podczas komunikacji z AI. Spróbuj ponownie.');
    }
  }
}

export default new OpenAIService();
