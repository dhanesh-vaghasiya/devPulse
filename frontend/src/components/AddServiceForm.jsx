export default function AddServiceForm({ value, onChange, onSubmit, submitting }) {
  return (
    <section className="panel add-service-panel">
      <div>
        <h2>Add Service</h2>
        <p>Register a new endpoint to start monitoring it immediately.</p>
      </div>

      <form className="add-form" onSubmit={onSubmit}>
        <input
          type="url"
          placeholder="https://example.com"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add Service'}
        </button>
      </form>
    </section>
  );
}
