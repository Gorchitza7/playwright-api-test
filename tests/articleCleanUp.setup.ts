import { test as setup, expect } from '@playwright/test';

setup('delete artticle', async({request}) => {
	const deleteArticleResponse = await request.delete(`https://conduit-api.bondaracademy.com/api/articles/${process.env.SLUGID}`)

  expect(deleteArticleResponse.status()).toEqual(204)
})