import Disclosure from "./Disclosure";

const faqs = [
  {
    id: "shipping",
    question: "How long does shipping take?",
    answer: "Orders typically arrive within 3-5 business days for domestic addresses.",
  },
  {
    id: "returns",
    question: "What is your return policy?",
    answer: "You can return unused items within 30 days of delivery for a full refund.",
  },
  {
    id: "support",
    question: "How do I contact support?",
    answer: "Email support@example.com or use the chat widget in the bottom right corner.",
  },
];

export default function App() {
  return (
    <div style={{ padding: 40, maxWidth: 480 }}>
      <h2>Frequently asked questions</h2>
      {faqs.map((faq) => (
        <Disclosure key={faq.id} id={faq.id} title={faq.question}>
          <p style={{ margin: 0 }}>{faq.answer}</p>
        </Disclosure>
      ))}
    </div>
  );
}
