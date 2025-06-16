// Similar: Async function with same logic
async function getUserInfo(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    throw new Error('User not found');
  }
  const userData = await res.json();
  return userData;
}