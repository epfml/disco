import fs, { Stats } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { ReadableOptions } from 'stream'

function streamFile(path: string, options?: ReadableOptions): ReadableStream<Uint8Array> {
    const stream = fs.createReadStream(path, options)

    return new ReadableStream({
        start(controller) {
            stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)))
            stream.on('end', () => controller.close())
            stream.on('error', (error: NodeJS.ErrnoException) => controller.error(error))
        },
        cancel() {
            stream.destroy()
        },
    })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const type = req.nextUrl.searchParams.get('type') as keyof typeof files
    if (!type) return new NextResponse('Missing type parameter', { status: 400 })

    const file = files[type][0]
    const stats: Stats = await fs.promises.stat(file)
    const data: ReadableStream<Uint8Array> = streamFile(file) // Stream the file with a 1kb chunk
    const res = new NextResponse(data, {
        status: 200,
        headers: new Headers({
            'content-disposition': `attachment; filename=${path.basename(file)}`,
            'content-type': 'application/octet-stream',
            'content-length': stats.size + '',
        }),
    })

    return res
}
