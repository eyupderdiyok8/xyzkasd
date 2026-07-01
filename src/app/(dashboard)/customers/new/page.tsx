import CustomerForm from '@/components/CustomerForm';

export default function NewCustomerPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Müşteri</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Yeni bir müşteri kaydı oluşturun
        </p>
      </div>
      <CustomerForm />
    </div>
  );
}
