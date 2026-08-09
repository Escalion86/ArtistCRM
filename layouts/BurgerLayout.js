import Burger from '@components/Burger'

function BurgerLayout() {
  return (
    <div
      className="burger-layout flex h-16 items-center justify-center"
      style={{ gridArea: 'burger' }}
    >
      <Burger />
    </div>
  )
}

export default BurgerLayout
