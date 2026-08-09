import menuOpenAtom from '@state/atoms/menuOpen'
import { useAtom } from 'jotai'

const Burger = () => {
  const [menuOpen, setMenuOpen] = useAtom(menuOpenAtom)
  return (
    <div
      className={'menu-btn' + (menuOpen ? ' open' : '')}
      onClick={() => setMenuOpen((state) => !state)}
    >
      <div className="menu-btn__burger" />
    </div>
  )
}

export default Burger
