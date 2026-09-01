export function getRolloverCreationDate(creationDate: string, today: string) {
  const [start, end] = creationDate.split('_');

  return end && end !== start ? `${start}_${today}` : today;
}
