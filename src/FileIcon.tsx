import { getIconForFile } from 'vscode-icons-js'

export default function FileIcon(props: { name: string }) {
  return (
    <img
      width={32}
      height={32}
      src={
        'https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@11.0.0/icons/' +
        getIconForFile(props.name)
      }
    />
  )
}
