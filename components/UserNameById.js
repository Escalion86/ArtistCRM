import { useUsersQuery } from '@helpers/useEntityQueries'
import UserName from './UserName'

const UserNameById = ({ userId, className, noWrap, showStatus, trunc }) => {
  const { data: users } = useUsersQuery()
  const user = users?.find(u => String(u._id) === String(userId))
  return (
    <UserName
      user={user}
      className={className}
      noWrap={noWrap}
      showStatus={showStatus}
      trunc={trunc}
    />
  )
}

export default UserNameById
