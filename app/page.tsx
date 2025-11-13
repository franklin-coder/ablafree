
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Users, Headphones } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Traductor en Tiempo Real
          </h1>
          <p className="text-xl text-gray-600">
            Conecta clientes y empleados rompiendo las barreras del idioma
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Link href="/cliente">
            <Button 
              size="lg" 
              className="w-full h-24 text-lg bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Users className="mr-3 h-8 w-8" />
              Soy Cliente
            </Button>
          </Link>
          
          <Link href="/cajero">
            <Button 
              size="lg" 
              className="w-full h-24 text-lg bg-green-600 hover:bg-green-700 transition-colors"
            >
              <Headphones className="mr-3 h-8 w-8" />
              Soy Empleado
            </Button>
          </Link>
        </div>
        
        <div className="mt-12 p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-3">¿Cómo funciona?</h2>
          <div className="text-left space-y-2 text-gray-600">
            <p>1. El cliente selecciona su idioma y se conecta</p>
            <p>2. El empleado usa el mismo código de sesión</p>
            <p>3. Hablen normalmente - la traducción es automática</p>
            <p>4. El audio traducido se reproduce instantáneamente</p>
          </div>
        </div>
      </div>
    </div>
  )
}
