import UserCard from '@layouts/cards/UserCard'
import windowDimensionsAtom from '@state/atoms/windowDimensionsAtom'
import { useAtomValue } from 'jotai'
import ListWrapper from './ListWrapper'
import useUiDensity from '@helpers/useUiDensity'

const UsersList = ({ users }) => {
  const widthNum = useAtomValue(windowDimensionsAtom)
  const { isCompact } = useUiDensity()
  const itemSize = isCompact
    ? widthNum > 2
      ? 158
      : 182
    : widthNum > 2
      ? 180
      : 210
  return (
    <ListWrapper
      itemCount={users.length}
      itemSize={itemSize}
      className="bg-gray-50"
    >
      {({ index, style }) => (
        <UserCard
          style={style}
          key={users[index]._id}
          userId={users[index]._id}
        />
      )}
    </ListWrapper>
  )
}

export default UsersList
