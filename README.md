# nodejs-poc-stream-file-upload-to-s3

Proof of concept: handle file upload with Node.js Stream, to stream the upload body (file) to S3 client and upload it directly, without creating a temporary copy on a server.

## Generate random binary files for uploads

```bash
# 1MiB
dd if=/dev/urandom of=1m.bin bs=1m count=1

# 128MiB
dd if=/dev/urandom of=128m.bin bs=64m count=2

# 1GiB
dd if=/dev/urandom of=1g.bin bs=64m count=16
```

## Upload files

```bash
curl \
  -X POST \
  http://localhost:3000/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@./1m.bin"

# Change the -F "..." to upload other files
# 1MiB:   -F "file=@./1m.bin"
# 128MiB: -F "file=@./128m.bin"
# 1GiB:   -F "file=@./1g.bin"
```

The 1GiB file will fail with HTTP status code 413, Request Entity Too Large, which is caused by formidable.

## Next

- Increase formidable entity size
- Test support for other content types like `application/octet-stream`
- Try `formidable-mini` package instead of `formidable`

## Links

- [Node.js Streams](https://nodejs.org/api/stream.html)
  - [Node.js Streams: Readable](https://nodejs.org/api/stream.html#stream_readable_streams)
- [npm: Formidable](https://www.npmjs.com/package/formidable)
