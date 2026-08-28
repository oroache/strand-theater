import Tabs from "./Tabs";

export default function App() {
  return (
    <div style={{ padding: 40 }}>
      <Tabs
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: <p>This is the overview content.</p>,
          },
          {
            id: "details",
            label: "Details",
            content: <p>This is the details content.</p>,
          },
          {
            id: "reviews",
            label: "Reviews",
            content: <p>This is the reviews content.</p>,
          },
        ]}
      />
    </div>
  );
}
